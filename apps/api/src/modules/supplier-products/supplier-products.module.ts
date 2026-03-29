import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierProduct, SupplierProductSchema } from './schemas/supplier-product.schema';
import { SupplierProductsService } from './supplier-products.service';
import { SupplierProductsController } from './supplier-products.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupplierProduct.name, schema: SupplierProductSchema },
    ]),
  ],
  controllers: [SupplierProductsController],
  providers: [SupplierProductsService],
  exports: [SupplierProductsService],
})
export class SupplierProductsModule {}
