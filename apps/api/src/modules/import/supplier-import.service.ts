import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from './schemas/import-job.schema';
import { ExcelParser } from './parsers/excel.parser';
import { SupplierProductsService } from '../supplier-products/supplier-products.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { MappingSettingsService } from '../mapping-settings/mapping-settings.service';
import { ImportStatus } from '../../common/constants';
import { UnifiedProduct } from '../unified-products/schemas/unified-product.schema';
import { SupplierProduct } from '../supplier-products/schemas/supplier-product.schema';

export interface SupplierValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error';
  errors?: string[];
}

@Injectable()
export class SupplierImportService {
  constructor(
    @InjectModel(ImportJob.name)
    private importJobModel: Model<ImportJobDocument>,
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProduct>,
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProduct>,
    private excelParser: ExcelParser,
    private supplierProductsService: SupplierProductsService,
    private suppliersService: SuppliersService,
    private mappingSettingsService: MappingSettingsService,
  ) {}

  /**
   * Step 1: Upload & parse Excel file for supplier products
   */
  async uploadAndParse(
    file: Express.Multer.File,
    supplierId: string,
    userId: string,
  ) {
    // Verify supplier exists
    await this.suppliersService.findById(supplierId);

    const parsed = await this.excelParser.parse(file.buffer);
    if (parsed.totalRows === 0) {
      throw new BadRequestException('El archivo no contiene datos');
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
      headers: parsed.headers,
      autoMapping,
      totalRows: parsed.totalRows,
      sampleRows: parsed.rows.slice(0, 5),
    };
  }

  /**
   * Step 2: Validate with given mapping, return preview
   */
  async preview(
    jobId: string,
    file: Express.Multer.File,
    mapping: Record<string, string>,
  ) {
    const job = await this.getJob(jobId);
    if (job.importType !== 'supplier_products') {
      throw new BadRequestException('Este job no es de tipo supplier_products');
    }

    const parsed = await this.excelParser.parse(file.buffer);

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

    const validRows = job.previewData.filter((r) => r.status === 'valid');
    let supplierProductsCreated = 0;
    let supplierProductsUpdated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const row of validRows) {
      try {
        const data = row.data as Record<string, any>;

        const { isNew } = await this.supplierProductsService.createOrUpdate({
          supplierId: job.supplierId!.toString(),
          supplierSku: data.supplierSku,
          supplierName: data.supplierName,
          supplierDescription: data.supplierDescription,
          supplierCategory: data.supplierCategory,
          basePrice: data.basePrice ?? 0,
          discountPercent: data.discountPercent ?? 0,
        });

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

    // Auto-map if enabled
    let autoMapped = 0;
    let autoCreated = 0;

    try {
      const settings = await this.mappingSettingsService.getSettings();

      if (settings.autoMapOnImport && settings.autoMapStrategy !== 'disabled') {
        const autoMapResult = await this.performAutoMap(
          job.supplierId!.toString(),
          settings,
        );
        autoMapped = autoMapResult.mapped;
        autoCreated = autoMapResult.created;
      }
    } catch (err) {
      // Auto-map errors shouldn't fail the import
      console.error('Auto-map error:', err);
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
   * Perform auto-mapping based on settings
   */
  private async performAutoMap(
    supplierId: string,
    settings: any,
  ): Promise<{ mapped: number; created: number }> {
    let mapped = 0;
    let created = 0;

    // Find unmapped supplier products from this import
    const unmapped = await this.supplierProductModel.find({
      supplierId: new Types.ObjectId(supplierId),
      unifiedProductId: null,
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
            selectedSupplierProductId: sp._id,
            selectedCost: sp.netCost,
            profitMarginPercent: settings.defaultProfitMargin,
          });

          await newUnified.save();
          sp.unifiedProductId = newUnified._id;
          await sp.save();
          created++;
        }
      }
    }

    return { mapped, created };
  }

  private validateSupplierRow(
    rowNumber: number,
    row: Record<string, any>,
    mapping: Record<string, string>,
  ): SupplierValidatedRow {
    const errors: string[] = [];
    const data: Record<string, any> = {};

    // Extract mapped values
    const supplierSku = mapping.supplierSku ? String(row[mapping.supplierSku] ?? '').trim() : '';
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
}
