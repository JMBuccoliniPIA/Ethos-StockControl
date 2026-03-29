import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SupplierProductsService } from './supplier-products.service';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import { RequirePermissions } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('supplier-products')
@UseGuards(RolesGuard)
export class SupplierProductsController {
  constructor(private readonly supplierProductsService: SupplierProductsService) {}

  @Get()
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findAll(@Query('supplierId') supplierId?: string) {
    if (supplierId) {
      return this.supplierProductsService.findBySupplier(supplierId);
    }
    return this.supplierProductsService.findAll();
  }

  @Get('unmapped')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findUnmapped() {
    return this.supplierProductsService.findUnmapped();
  }

  @Get('by-supplier/:supplierId')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findBySupplier(@Param('supplierId') supplierId: string) {
    return this.supplierProductsService.findBySupplier(supplierId);
  }

  @Get('by-unified/:unifiedProductId')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findByUnifiedProduct(@Param('unifiedProductId') unifiedProductId: string) {
    return this.supplierProductsService.findByUnifiedProduct(unifiedProductId);
  }

  @Get(':id')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findOne(@Param('id') id: string) {
    return this.supplierProductsService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  create(@Body() dto: CreateSupplierProductDto) {
    return this.supplierProductsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierProductDto) {
    return this.supplierProductsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  async delete(@Param('id') id: string) {
    await this.supplierProductsService.delete(id);
    return { message: 'Producto de proveedor eliminado' };
  }

  @Post(':id/link/:unifiedProductId')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  linkToUnifiedProduct(
    @Param('id') id: string,
    @Param('unifiedProductId') unifiedProductId: string,
  ) {
    return this.supplierProductsService.linkToUnifiedProduct(id, unifiedProductId);
  }

  @Delete(':id/unlink')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  unlinkFromUnifiedProduct(@Param('id') id: string) {
    return this.supplierProductsService.unlinkFromUnifiedProduct(id);
  }
}
