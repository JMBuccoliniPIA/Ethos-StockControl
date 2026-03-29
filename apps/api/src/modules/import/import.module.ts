import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema';
import { ImportService } from './import.service';
import { SupplierImportService } from './supplier-import.service';
import { ImportController } from './import.controller';
import { ExcelParser } from './parsers/excel.parser';
import { RowValidator } from './validators/row.validator';
import { ProductsModule } from '../products/products.module';
import { FamiliesModule } from '../families/families.module';
import { SubfamiliesModule } from '../subfamilies/subfamilies.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { SupplierProductsModule } from '../supplier-products/supplier-products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
    ]),
    ProductsModule,
    FamiliesModule,
    SubfamiliesModule,
    SuppliersModule,
    SupplierProductsModule,
  ],
  controllers: [ImportController],
  providers: [ImportService, SupplierImportService, ExcelParser, RowValidator],
})
export class ImportModule {}
