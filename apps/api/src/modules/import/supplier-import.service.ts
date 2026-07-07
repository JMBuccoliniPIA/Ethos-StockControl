import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from './schemas/import-job.schema';
import { ExcelParser } from './parsers/excel.parser';
import { SupplierParserRegistry } from './parsers/suppliers/supplier-parser.registry';
import { AiParserService } from './parsers/ai/ai-parser.service';
import { ParsedSupplierRow, ParsedSupplierList } from './parsers/suppliers/supplier-parser.interface';
import { SupplierProductsService } from '../supplier-products/supplier-products.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { MappingSettingsService } from '../mapping-settings/mapping-settings.service';
import { ProductsService } from '../products/products.service';
import { FamiliesService } from '../families/families.service';
import { ImportStatus } from '../../common/constants';
import { UnifiedProduct } from '../unified-products/schemas/unified-product.schema';
import { SupplierProduct } from '../supplier-products/schemas/supplier-product.schema';

const DEFAULT_IMPACT_FAMILY = 'Sin clasificar';

export interface SupplierValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error';
  errors?: string[];
}

@Injectable()
export class SupplierImportService {
  private readonly logger = new Logger(SupplierImportService.name);

  constructor(
    @InjectModel(ImportJob.name)
    private importJobModel: Model<ImportJobDocument>,
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProduct>,
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProduct>,
    private excelParser: ExcelParser,
    private parserRegistry: SupplierParserRegistry,
    private aiParser: AiParserService,
    private supplierProductsService: SupplierProductsService,
    private suppliersService: SuppliersService,
    private mappingSettingsService: MappingSettingsService,
    private productsService: ProductsService,
    private familiesService: FamiliesService,
  ) {}

  /**
   * Step 1: Upload & parse file for supplier products.
   *
   * Priority:
   *   1. Specific parser (parserKey) — exact, deterministic, no row limit
   *   2. AI parser (GPT-4o) — universal fallback, works with any format
   *   3. Generic Excel flow — manual column mapping as last resort
   */
  async uploadAndParse(
    file: Express.Multer.File,
    supplierId: string,
    userId: string,
    sheetName?: string,
  ) {
    const supplier = await this.suppliersService.findById(supplierId);
    const mimeType = file.mimetype || file.originalname;

    // ── 1. Try specific parser first (deterministic, no row limit) ──
    const specificParser = this.parserRegistry.get(supplier.parserKey);
    if (specificParser) {
      try {
        this.logger.log(`Attempting specific parser "${supplier.parserKey}" for "${supplier.name}"`);
        const parsed = await specificParser.parse(file.buffer, { sheetName });
        if (parsed.rows.length > 0) {
          return this.buildAutoParsedResponse(
            file, supplierId, userId, parsed, supplier.parserKey!,
          );
        }
        this.logger.warn(
          `Specific parser "${supplier.parserKey}" returned 0 products, falling back to AI...`,
        );
      } catch (err: any) {
        this.logger.warn(`Specific parser "${supplier.parserKey}" failed: ${err.message}`);
      }
    }

    // ── 2. Fallback: AI parser ──
    if (this.aiParser.isAvailable()) {
      try {
        this.logger.log(`Attempting AI parse for supplier "${supplier.name}"`);
        const aiResult = await this.aiParser.parse(file.buffer, mimeType, supplier.name);

        if (aiResult.rows.length > 0) {
          return this.buildAutoParsedResponse(file, supplierId, userId, aiResult, 'ai');
        }

        this.logger.warn(
          `AI parser returned 0 products for "${supplier.name}", falling back...`,
        );
      } catch (err: any) {
        this.logger.warn(`AI parser failed for "${supplier.name}": ${err.message}`);
      }
    }

    // ── 3. Fallback: generic Excel column mapping ──
    return this.genericExcelFlow(file, supplierId, userId, sheetName);
  }

  /**
   * Build the auto-parsed response (used by both AI and specific parsers).
   */
  private async buildAutoParsedResponse(
    file: Express.Multer.File,
    supplierId: string,
    userId: string,
    parsed: ParsedSupplierList,
    parserKey: string,
  ) {
    if (parsed.rows.length === 0) {
      const detail = parsed.warnings?.slice(0, 3).map((w) => w.message).join(' | ');
      throw new BadRequestException(
        detail
          ? `El parser no extrajo productos del archivo. Detalle: ${detail}`
          : 'El parser no extrajo productos del archivo',
      );
    }

    const previewData = parsed.rows.map((row, i) => ({
      rowNumber: i + 1,
      data: this.rowToData(row) as Record<string, unknown>,
      status: 'valid' as const,
    }));

    const job = await this.importJobModel.create({
      fileName: file.filename || file.originalname,
      originalName: file.originalname,
      status: ImportStatus.PREVIEW,
      importType: 'supplier_products',
      supplierId: new Types.ObjectId(supplierId),
      totalRows: parsed.rows.length,
      validRows: parsed.rows.length,
      errorRows: 0,
      duplicateRows: 0,
      previewData,
      uploadedBy: userId,
    });

    return {
      jobId: job._id,
      parserKey,
      autoParsed: true,
      sheetNames: [] as string[],
      headers: [] as string[],
      autoMapping: {} as Record<string, string>,
      totalRows: parsed.rows.length,
      sampleRows: previewData.slice(0, 20).map((p) => p.data),
      warnings: parsed.warnings,
    };
  }

  /**
   * Generic Excel flow: require manual column mapping.
   */
  private async genericExcelFlow(
    file: Express.Multer.File,
    supplierId: string,
    userId: string,
    sheetName?: string,
  ) {
    const sheetNames = await this.excelParser.getSheetNames(file.buffer);
    const parsed = await this.excelParser.parse(file.buffer, sheetName);
    if (parsed.totalRows === 0) {
      throw new BadRequestException(
        'No se pudieron extraer productos del archivo. ' +
        'Verificá que el archivo contenga datos tabulares válidos.',
      );
    }

    const autoMapping = this.autoDetectSupplierMapping(parsed.headers);

    const job = await this.importJobModel.create({
      fileName: file.filename || file.originalname,
      originalName: file.originalname,
      status: ImportStatus.PENDING,
      importType: 'supplier_products',
      supplierId: new Types.ObjectId(supplierId),
      totalRows: parsed.totalRows,
      columnMapping: autoMapping,
      uploadedBy: userId,
    });

    return {
      jobId: job._id,
      autoParsed: false,
      sheetNames,
      headers: parsed.headers,
      autoMapping,
      totalRows: parsed.totalRows,
      sampleRows: parsed.rows.slice(0, 20),
    };
  }

  private rowToData(row: ParsedSupplierRow): Record<string, any> {
    return {
      supplierSku: row.supplierSku?.trim().toUpperCase(),
      supplierName: row.supplierName,
      supplierDescription: row.supplierDescription,
      supplierCategory: row.supplierCategory,
      color: row.color,
      basePrice: row.basePrice,
      discountPercent: row.discountPercent ?? 0,
      currency: row.currency,
      metadata: row.metadata,
    };
  }

  /**
   * Step 2: Validate with given mapping, return preview
   */
  async preview(
    jobId: string,
    file: Express.Multer.File,
    mapping: Record<string, string>,
    sheetName?: string,
  ) {
    const job = await this.getJob(jobId);
    if (job.importType !== 'supplier_products') {
      throw new BadRequestException('Este job no es de tipo supplier_products');
    }

    const parsed = await this.excelParser.parse(file.buffer, sheetName);

    // Validate all rows
    const validated: SupplierValidatedRow[] = parsed.rows.map((row, i) =>
      this.validateSupplierRow(i + 2, row, mapping),
    );

    const validRows = validated.filter((r) => r.status === 'valid').length;
    const errorRows = validated.filter((r) => r.status === 'error').length;

    // Update job
    job.status = ImportStatus.PREVIEW;
    job.columnMapping = mapping;
    job.totalRows = validated.length;
    job.validRows = validRows;
    job.errorRows = errorRows;
    job.duplicateRows = 0; // For supplier products, we update duplicates instead of rejecting
    job.previewData = validated.map((v) => ({
      rowNumber: v.rowNumber,
      data: v.data as Record<string, unknown>,
      status: v.status,
      errors: v.errors,
    }));
    await job.save();

    return {
      jobId: job._id,
      totalRows: validated.length,
      validRows,
      errorRows,
      preview: validated,
    };
  }

  /**
   * Step 3: Confirm import — creates or updates supplier products
   */
  async confirm(jobId: string) {
    const job = await this.getJob(jobId);
    if (job.status !== ImportStatus.PREVIEW) {
      throw new BadRequestException('El job debe estar en estado preview para confirmar');
    }
    if (job.importType !== 'supplier_products') {
      throw new BadRequestException('Este job no es de tipo supplier_products');
    }

    job.status = ImportStatus.PROCESSING;
    await job.save();

    // Deduplicate rows by supplierSku (last occurrence wins) so a file with
    // repeated SKUs doesn't corrupt the revert snapshot or double-process.
    const validRows = this.dedupeBySku(
      job.previewData.filter((r) => r.status === 'valid'),
    );
    let supplierProductsCreated = 0;
    let supplierProductsUpdated = 0;
    const errors: Array<{ row: number; message: string }> = [];
    const previousValues: ImportJobDocument['previousValues'] = [];
    const touchedSkus: string[] = [];
    const touchedSpIds: Types.ObjectId[] = [];

    for (const row of validRows) {
      try {
        const data = row.data as Record<string, any>;

        // Capture previous values so revert() can restore them
        const existingBefore = await this.supplierProductModel.findOne({
          supplierId: new Types.ObjectId(job.supplierId!.toString()),
          supplierSku: data.supplierSku,
        });

        const { product, isNew } = await this.supplierProductsService.createOrUpdate(
          {
            supplierId: job.supplierId!.toString(),
            supplierSku: data.supplierSku,
            supplierName: data.supplierName,
            supplierDescription: data.supplierDescription,
            supplierCategory: data.supplierCategory,
            color: data.color,
            basePrice: data.basePrice ?? 0,
            discountPercent: data.discountPercent ?? 0,
            currency: data.currency,
            metadata: data.metadata,
          },
          job._id.toString(),
        );

        touchedSkus.push(data.supplierSku);
        touchedSpIds.push(product._id);

        previousValues.push(
          isNew
            ? {
                supplierProductId: product._id.toString(),
                wasCreated: true,
              }
            : {
                supplierProductId: product._id.toString(),
                wasCreated: false,
                basePrice: existingBefore!.basePrice,
                discountPercent: existingBefore!.discountPercent,
                supplierName: existingBefore!.supplierName,
              },
        );

        if (isNew) {
          supplierProductsCreated++;
        } else {
          supplierProductsUpdated++;
        }
      } catch (err: any) {
        errors.push({
          row: row.rowNumber,
          message: err.message || 'Error desconocido',
        });
      }
    }

    job.previousValues = previousValues;

    // Propagate the new netCost to any UnifiedProduct that selected one of the
    // supplier products touched by this import, recalculating its salePrice.
    await this.propagateCostToUnified(touchedSpIds);

    // Auto-map if enabled
    let autoMapped = 0;
    let autoCreated = 0;

    try {
      const settings = await this.mappingSettingsService.getSettings();

      if (settings.autoMapOnImport && settings.autoMapStrategy !== 'disabled') {
        const autoMapResult = await this.performAutoMap(
          job.supplierId!.toString(),
          settings,
          touchedSkus,
        );
        autoMapped = autoMapResult.mapped;
        autoCreated = autoMapResult.created;
        job.autoCreatedUnifiedIds = autoMapResult.createdUnifiedIds;
      }
    } catch (err: any) {
      // Auto-map errors shouldn't fail the import
      this.logger.error(`Auto-map error: ${err?.message ?? err}`, err?.stack);
    }

    job.status = ImportStatus.COMPLETED;
    job.result = {
      productsCreated: autoCreated,
      familiesCreated: 0,
      subfamiliesCreated: 0,
      stockMovements: 0,
      supplierProductsCreated,
      supplierProductsUpdated,
    };
    job.errors = errors as any;
    job.completedAt = new Date();
    await job.save();

    return {
      jobId: job._id,
      status: 'completed',
      supplierProductsCreated,
      supplierProductsUpdated,
      autoMapped,
      autoCreated,
      errors,
    };
  }

  /**
   * Keep only the last row per supplierSku (last price wins).
   */
  private dedupeBySku(
    rows: ImportJobDocument['previewData'],
  ): ImportJobDocument['previewData'] {
    const bySku = new Map<string, ImportJobDocument['previewData'][number]>();
    for (const row of rows) {
      const sku = String((row.data as Record<string, any>).supplierSku ?? '');
      if (sku) bySku.set(sku, row);
    }
    return [...bySku.values()];
  }

  /**
   * Refresh selectedCost + salePrice on any UnifiedProduct whose selected cost
   * source is one of the given supplier products (after a price reimport).
   */
  private async propagateCostToUnified(supplierProductIds: Types.ObjectId[]) {
    if (supplierProductIds.length === 0) return;
    const affected = await this.unifiedProductModel.find({
      selectedSupplierProductId: { $in: supplierProductIds },
    });
    for (const up of affected as any[]) {
      const sp = await this.supplierProductModel.findById(up.selectedSupplierProductId);
      if (sp) {
        up.selectedCost = sp.netCost;
        await up.save(); // pre-save hook recalculates salePrice
      }
    }
  }

  /**
   * Perform auto-mapping based on settings, scoped to the SKUs of this import.
   */
  private async performAutoMap(
    supplierId: string,
    settings: any,
    skus: string[],
  ): Promise<{ mapped: number; created: number; createdUnifiedIds: string[] }> {
    let mapped = 0;
    let created = 0;
    const createdUnifiedIds: string[] = [];

    // Find unmapped supplier products from THIS import only
    const unmapped = await this.supplierProductModel.find({
      supplierId: new Types.ObjectId(supplierId),
      unifiedProductId: null,
      ...(skus.length ? { supplierSku: { $in: skus } } : {}),
    });

    for (const sp of unmapped) {
      // Try exact SKU match first
      if (settings.autoMapStrategy === 'exact_sku' || settings.autoMapStrategy === 'similar_name') {
        const normalizedSku = sp.supplierSku.toUpperCase().trim();
        const unified = await this.unifiedProductModel.findOne({ sku: normalizedSku });

        if (unified) {
          sp.unifiedProductId = unified._id;
          await sp.save();
          mapped++;
          continue;
        }
      }

      // Create new unified product if enabled
      if (settings.createUnifiedIfNoMatch) {
        // Check if SKU already exists
        const existingSku = await this.unifiedProductModel.findOne({
          sku: sp.supplierSku.toUpperCase(),
        });

        if (!existingSku) {
          const newUnified = new this.unifiedProductModel({
            sku: sp.supplierSku.toUpperCase(),
            name: sp.supplierName,
            description: sp.supplierDescription,
            color: sp.color,
            selectedSupplierProductId: sp._id,
            selectedCost: sp.netCost,
            profitMarginPercent: settings.defaultProfitMargin,
          });

          await newUnified.save();
          sp.unifiedProductId = newUnified._id;
          await sp.save();
          created++;
          createdUnifiedIds.push(newUnified._id.toString());
        }
      }
    }

    return { mapped, created, createdUnifiedIds };
  }

  private validateSupplierRow(
    rowNumber: number,
    row: Record<string, any>,
    mapping: Record<string, string>,
  ): SupplierValidatedRow {
    const errors: string[] = [];
    const data: Record<string, any> = {};

    // Extract mapped values — SKU is normalized (trim + uppercase) so reimports match consistently
    const supplierSku = mapping.supplierSku
      ? String(row[mapping.supplierSku] ?? '').trim().toUpperCase()
      : '';
    const supplierName = mapping.supplierName ? String(row[mapping.supplierName] ?? '').trim() : '';
    const supplierDescription = mapping.supplierDescription
      ? String(row[mapping.supplierDescription] ?? '').trim()
      : undefined;
    const supplierCategory = mapping.supplierCategory
      ? String(row[mapping.supplierCategory] ?? '').trim()
      : undefined;
    const basePrice = mapping.basePrice ? this.parsePrice(row[mapping.basePrice]) : 0;
    const discountPercent = mapping.discountPercent
      ? this.parsePrice(row[mapping.discountPercent])
      : 0;
    const color = mapping.color
      ? String(row[mapping.color] ?? '').trim() || undefined
      : undefined;
    // Currency: only override the ARS default when a USD-like value is present
    const currencyRaw = mapping.currency
      ? String(row[mapping.currency] ?? '').trim().toUpperCase()
      : '';
    const currency: 'ARS' | 'USD' | undefined = !currencyRaw
      ? undefined
      : /USD|U\$S|DOLAR|DÓLAR/.test(currencyRaw)
        ? 'USD'
        : 'ARS';

    // Validations
    if (!supplierSku) {
      errors.push('Código de proveedor es requerido');
    }
    if (!supplierName) {
      errors.push('Nombre del producto es requerido');
    }
    if (basePrice < 0) {
      errors.push('El precio no puede ser negativo');
    }
    if (discountPercent < 0 || discountPercent > 100) {
      errors.push('El descuento debe estar entre 0 y 100');
    }

    data.supplierSku = supplierSku;
    data.supplierName = supplierName;
    data.supplierDescription = supplierDescription;
    data.supplierCategory = supplierCategory;
    data.basePrice = basePrice;
    data.discountPercent = discountPercent;
    data.color = color;
    data.currency = currency;

    return {
      rowNumber,
      data,
      status: errors.length > 0 ? 'error' : 'valid',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse price value handling currency symbols and locale formats
   */
  private parsePrice(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    // Convert to string and clean up
    let str = String(value).trim();

    // Remove currency symbols and whitespace
    str = str.replace(/[$€£¥\s]/g, '');

    // Handle Argentine/European format (1.234,56) vs US format (1,234.56)
    // If has comma as decimal separator (e.g., "1.234,56")
    if (str.includes(',') && str.includes('.')) {
      // Check which comes last - that's the decimal separator
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Argentine format: 1.234,56 → 1234.56
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234.56 → 1234.56
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      // Only comma - could be decimal (1,5) or thousand (1,000)
      const parts = str.split(',');
      if (parts[1]?.length === 3) {
        // Thousand separator: 1,000 → 1000
        str = str.replace(/,/g, '');
      } else {
        // Decimal separator: 1,5 → 1.5
        str = str.replace(',', '.');
      }
    }

    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  private autoDetectSupplierMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    );

    const aliases: Record<string, string[]> = {
      supplierSku: ['codigo', 'sku', 'cod', 'art', 'articulo', 'referencia', 'ref', 'code'],
      supplierName: ['nombre', 'descripcion', 'producto', 'articulo', 'item', 'name', 'product'],
      supplierDescription: ['detalle', 'observaciones', 'obs', 'notas', 'detail', 'notes'],
      supplierCategory: ['categoria', 'familia', 'rubro', 'linea', 'category', 'group'],
      basePrice: ['general $', 'general', 'precio', 'precio_lista', 'p_lista', 'costo', 'valor', 'price', 'cost', 'lista'],
      discountPercent: ['descuento', 'dto', 'desc', 'bonificacion', 'bonif', 'discount'],
      currency: ['moneda', 'currency', 'divisa'],
      color: ['color', 'colour'],
    };

    for (const [field, fieldAliases] of Object.entries(aliases)) {
      for (const alias of fieldAliases) {
        const idx = normalizedHeaders.findIndex((h) => h.includes(alias));
        if (idx !== -1 && !Object.values(mapping).includes(headers[idx])) {
          mapping[field] = headers[idx];
          break;
        }
      }
    }

    return mapping;
  }

  async getJob(jobId: string): Promise<ImportJobDocument> {
    const job = await this.importJobModel.findById(jobId);
    if (!job) throw new NotFoundException('Import job no encontrado');
    return job;
  }

  /**
   * Push the supplier products from this job into the Products + Stock catalog.
   * - SKU match → update basePrice + discountPercent (stock untouched).
   * - No match → create a new Product with stock 0 under the default family.
   */
  async impactStock(jobId: string, userId: string) {
    const job = await this.getJob(jobId);
    if (job.importType !== 'supplier_products') {
      throw new BadRequestException('Este job no es de tipo supplier_products');
    }
    if (job.status !== ImportStatus.COMPLETED) {
      throw new BadRequestException(
        'El job debe estar completado antes de impactar en stock',
      );
    }

    const defaultFamily = await this.familiesService.findOrCreateByName(
      DEFAULT_IMPACT_FAMILY,
    );
    const defaultFamilyId = defaultFamily._id.toString();

    const validRows = job.previewData.filter((r) => r.status === 'valid');
    let productsCreated = 0;
    let productsUpdated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const row of validRows) {
      try {
        const data = row.data as Record<string, any>;
        const sku = String(data.supplierSku ?? '').trim().toUpperCase();
        if (!sku) {
          errors.push({ row: row.rowNumber, message: 'SKU vacío' });
          continue;
        }

        const basePrice = Number(data.basePrice ?? 0);
        const discountPercent = Number(data.discountPercent ?? 0);
        const currency = data.currency === 'USD' ? 'USD' : 'ARS';
        const existing = await this.productsService.findBySku(sku);

        if (existing) {
          await this.productsService.update(existing._id.toString(), {
            basePrice,
            discountPercent,
            currency,
          });
          productsUpdated++;
        } else {
          await this.productsService.create(
            {
              sku,
              name: String(data.supplierName ?? sku),
              description: data.supplierDescription || undefined,
              familyId: defaultFamilyId,
              stock: 0,
              stockMin: 0,
              basePrice,
              discountPercent,
              currency,
            },
            userId,
          );
          productsCreated++;
        }
      } catch (err: any) {
        errors.push({
          row: row.rowNumber,
          message: err.message || 'Error desconocido',
        });
      }
    }

    return {
      jobId: job._id,
      productsCreated,
      productsUpdated,
      errors,
    };
  }

  /**
   * Revert a completed supplier import:
   * - SupplierProducts created by this job → deleted
   * - SupplierProducts that were updated → restored to their previous basePrice/discountPercent
   */
  async revert(jobId: string, userId: string) {
    const job = await this.getJob(jobId);
    if (job.importType !== 'supplier_products') {
      throw new BadRequestException('Solo se pueden revertir importaciones de proveedor');
    }
    if (job.status === ImportStatus.REVERTED) {
      throw new BadRequestException('Esta importación ya fue revertida');
    }
    if (job.status !== ImportStatus.COMPLETED) {
      throw new BadRequestException('Solo se pueden revertir importaciones completadas');
    }
    if (!job.previousValues || job.previousValues.length === 0) {
      throw new BadRequestException(
        'Esta importación no tiene snapshot guardado y no se puede revertir',
      );
    }

    let restored = 0;
    let deleted = 0;
    const errors: Array<{ message: string }> = [];

    for (const snapshot of job.previousValues) {
      try {
        const sp = await this.supplierProductModel.findById(snapshot.supplierProductId);
        if (!sp) {
          errors.push({ message: `Producto ${snapshot.supplierProductId} ya no existe` });
          continue;
        }

        if (snapshot.wasCreated) {
          // Unlink any unified product that selected this supplier product
          await this.unifiedProductModel.updateMany(
            { selectedSupplierProductId: sp._id },
            { $unset: { selectedSupplierProductId: '', selectedCost: '' } },
          );
          await sp.deleteOne();
          deleted++;
        } else {
          if (snapshot.basePrice !== undefined) sp.basePrice = snapshot.basePrice;
          if (snapshot.discountPercent !== undefined) sp.discountPercent = snapshot.discountPercent;
          if (snapshot.supplierName) sp.supplierName = snapshot.supplierName;
          await sp.save();
          restored++;
        }
      } catch (err: any) {
        errors.push({ message: err.message || 'Error desconocido' });
      }
    }

    // Remove UnifiedProducts that this job's auto-map created (avoid orphans)
    if (job.autoCreatedUnifiedIds?.length) {
      try {
        await this.unifiedProductModel.deleteMany({
          _id: { $in: job.autoCreatedUnifiedIds },
        });
      } catch (err: any) {
        errors.push({ message: err.message || 'Error al borrar productos unificados auto-creados' });
      }
    }

    job.status = ImportStatus.REVERTED;
    job.revertedAt = new Date();
    job.revertedBy = new Types.ObjectId(userId);
    await job.save();

    return {
      jobId: job._id,
      restored,
      deleted,
      errors,
    };
  }

  /**
   * Team-wide history of supplier imports, with supplier + uploader populated.
   */
  async getHistory(limit = 50) {
    return this.importJobModel
      .find({ importType: 'supplier_products' })
      .populate('supplierId', 'name code')
      .populate('uploadedBy', 'firstName lastName')
      .populate('revertedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-previewData -previousValues'); // exclude heavy arrays from list view
  }
}
