import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSupplierProductDto } from './create-supplier-product.dto';

export class UpdateSupplierProductDto extends PartialType(
  OmitType(CreateSupplierProductDto, ['supplierId', 'supplierSku'] as const)
) {}
