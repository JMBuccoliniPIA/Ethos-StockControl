import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UnifiedProduct, UnifiedProductSchema } from './schemas/unified-product.schema';
import { SupplierProduct, SupplierProductSchema } from '../supplier-products/schemas/supplier-product.schema';
import { UnifiedProductsService } from './unified-products.service';
import { UnifiedProductsController } from './unified-products.controller';
import { MappingSuggesterService } from './mapping-suggester.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnifiedProduct.name, schema: UnifiedProductSchema },
      { name: SupplierProduct.name, schema: SupplierProductSchema },
    ]),
  ],
  controllers: [UnifiedProductsController],
  providers: [UnifiedProductsService, MappingSuggesterService],
  exports: [UnifiedProductsService, MappingSuggesterService],
})
export class UnifiedProductsModule {}
