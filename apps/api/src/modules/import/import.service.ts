import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImportJob, ImportJobDocument } from './schemas/import-job.schema';
import { ExcelParser } from './parsers/excel.parser';
import { RowValidator, ValidatedRow } from './validators/row.validator';
import { ProductsService } from '../products/products.service';
import { FamiliesService } from '../families/families.service';
import { SubfamiliesService } from '../subfamilies/subfamilies.service';
import { ImportStatus } from '../../common/constants';

@Injectable()
export class ImportService {
  constructor(
    @InjectModel(ImportJob.name)
    private importJobModel: Model<ImportJobDocument>,
    private excelParser: ExcelParser,
    private rowValidator: RowValidator,
    private productsService: ProductsService,
    private familiesService: FamiliesService,
    private subfamiliesService: SubfamiliesService,
  ) {}

  /**
   * Step 1: Upload & parse the Excel file, auto-detect column mapping
   */
  async uploadAndParse(
    file: Express.Multer.File,
    userId: string,
  ) {
    const parsed = await this.excelParser.parse(file.buffer);
    if (parsed.totalRows === 0) {
      throw new BadRequestException('El archivo no contiene datos');
    }

    const autoMapping = this.excelParser.autoDetectMapping(parsed.headers);

    const job = await this.importJobModel.create({
      fileName: file.filename || file.originalname,
      originalName: file.originalname,
      status: ImportStatus.PENDING,
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

    const parsed = await this.excelParser.parse(file.buffer);

    // Get existing SKUs for duplicate detection
    const existingSkus = new Set<string>();
    if (mapping.sku) {
      const skusInFile = parsed.rows
        .map((r) => String(r[mapping.sku] ?? '').trim().toUpperCase())
        .filter(Boolean);
      for (const sku of skusInFile) {
        const existing = await this.productsService.findBySku(sku);
        if (existing) existingSkus.add(sku);
      }
    }

    // Validate all rows
    const seenSkus = new Set<string>();
    const validated: ValidatedRow[] = parsed.rows.map((row, i) =>
      this.rowValidator.validateRow(i + 2, row, mapping, existingSkus, seenSkus),
    );

    const validRows = validated.filter((r) => r.status === 'valid').length;
    const errorRows = validated.filter((r) => r.status === 'error').length;
    const duplicateRows = validated.filter((r) => r.status === 'duplicate').length;

    // Update job
    job.status = ImportStatus.PREVIEW;
    job.columnMapping = mapping;
    job.totalRows = validated.length;
    job.validRows = validRows;
    job.errorRows = errorRows;
    job.duplicateRows = duplicateRows;
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
      duplicateRows,
      preview: validated,
    };
  }

  /**
   * Step 3: Confirm import — only valid rows get persisted
   */
  async confirm(jobId: string, userId: string) {
    const job = await this.getJob(jobId);
    if (job.status !== ImportStatus.PREVIEW) {
      throw new BadRequestException('El job debe estar en estado preview para confirmar');
    }

    job.status = ImportStatus.PROCESSING;
    await job.save();

    const validRows = job.previewData.filter((r) => r.status === 'valid');
    let productsCreated = 0;
    let familiesCreated = 0;
    let subfamiliesCreated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Track created families to avoid duplicate lookups
    const familyCache = new Map<string, string>();
    const subfamilyCache = new Map<string, string>();

    for (const row of validRows) {
      try {
        const data = row.data as Record<string, any>;

        // Resolve or create family
        let familyId: string;
        const familyName = data.family as string;
        if (familyCache.has(familyName)) {
          familyId = familyCache.get(familyName)!;
        } else {
          const existingFamilies = await this.familiesService.findAll();
          const existing = existingFamilies.find(
            (f) => f.name.toLowerCase() === familyName.toLowerCase(),
          );
          if (existing) {
            familyId = existing._id.toString();
          } else {
            const created = await this.familiesService.create({ name: familyName });
            familyId = created._id.toString();
            familiesCreated++;
          }
          familyCache.set(familyName, familyId);
        }

        // Resolve or create subfamily
        let subfamilyId: string | undefined;
        const subfamilyName = data.subfamily as string | undefined;
        if (subfamilyName) {
          const cacheKey = `${familyId}:${subfamilyName}`;
          if (subfamilyCache.has(cacheKey)) {
            subfamilyId = subfamilyCache.get(cacheKey);
          } else {
            const sub = await this.subfamiliesService.findOrCreateByName(
              subfamilyName,
              familyId,
            );
            subfamilyId = sub._id.toString();
            subfamilyCache.set(cacheKey, subfamilyId);
            // Count as created only if it was newly created
            subfamiliesCreated++;
          }
        }

        // Generate SKU if not provided
        const sku = data.sku || `IMP-${Date.now()}-${row.rowNumber}`;

        // Create product
        await this.productsService.create(
          {
            sku,
            name: data.name,
            description: data.description,
            familyId,
            subfamilyId,
            stock: data.stock ?? 0,
            stockMin: data.stockMin ?? 0,
            basePrice: data.basePrice ?? 0,
            discountPercent: data.discountPercent ?? 0,
          },
          userId,
        );
        productsCreated++;
      } catch (err: any) {
        errors.push({
          row: row.rowNumber,
          message: err.message || 'Error desconocido',
        });
      }
    }

    job.status = ImportStatus.COMPLETED;
    job.result = {
      productsCreated,
      familiesCreated,
      subfamiliesCreated,
      stockMovements: 0,
    };
    job.errors = errors as any;
    job.completedAt = new Date();
    await job.save();

    return {
      jobId: job._id,
      status: 'completed',
      productsCreated,
      familiesCreated,
      subfamiliesCreated,
      errors,
    };
  }

  async getJob(jobId: string): Promise<ImportJobDocument> {
    const job = await this.importJobModel.findById(jobId);
    if (!job) throw new NotFoundException('Import job no encontrado');
    return job;
  }

  async getJobs(userId: string) {
    return this.importJobModel
      .find({ uploadedBy: userId })
      .sort({ createdAt: -1 })
      .limit(20);
  }
}
