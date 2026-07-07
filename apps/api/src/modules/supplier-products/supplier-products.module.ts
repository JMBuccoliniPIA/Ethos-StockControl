import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierProduct, SupplierProductSchema } from './schemas/supplier-product.schema';
import { UnifiedProduct, UnifiedProductSchema } from '../unified-products/schemas/unified-product.schema';
import { SupplierProductsService } from './supplier-products.service';
import { SupplierProductsController } from './supplier-products.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupplierProduct.name, schema: SupplierProductSchema },
      { name: UnifiedProduct.name, schema: UnifiedProductSchema },
    ]),
  ],
  controllers: [SupplierProductsController],
  providers: [SupplierProductsService],
  exports: [SupplierProductsService],
})
export class SupplierProductsModule {}
