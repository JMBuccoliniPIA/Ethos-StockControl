import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnifiedProductsService } from './unified-products.service';
import { MappingSuggesterService } from './mapping-suggester.service';
import { CreateUnifiedProductDto } from './dto/create-unified-product.dto';
import { UpdateUnifiedProductDto } from './dto/update-unified-product.dto';
import { QueryUnifiedProductDto } from './dto/query-unified-product.dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('unified-products')
@UseGuards(RolesGuard)
export class UnifiedProductsController {
  constructor(
    private readonly unifiedProductsService: UnifiedProductsService,
    private readonly mappingSuggesterService: MappingSuggesterService,
  ) {}

  @Get()
  @RequirePermissions(Permission.PRODUCTS_READ)
  findAll(@Query() query: QueryUnifiedProductDto) {
    return this.unifiedProductsService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions(Permission.PRODUCTS_READ)
  getStats() {
    return this.unifiedProductsService.getStats();
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCTS_READ)
  findOne(@Param('id') id: string) {
    return this.unifiedProductsService.findById(id);
  }

  @Get(':id/supplier-products')
  @RequirePermissions(Permission.PRODUCTS_READ)
  getLinkedSupplierProducts(@Param('id') id: string) {
    return this.unifiedProductsService.getLinkedSupplierProducts(id);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCTS_CREATE)
  create(
    @Body() dto: CreateUnifiedProductDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.unifiedProductsService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUnifiedProductDto) {
    return this.unifiedProductsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCTS_DELETE)
  async delete(@Param('id') id: string) {
    await this.unifiedProductsService.delete(id);
    return { message: 'Producto unificado eliminado' };
  }

  /**
   * Select a supplier product as the price source
   */
  @Post(':id/select-supplier/:supplierProductId')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  selectSupplier(
    @Param('id') id: string,
    @Param('supplierProductId') supplierProductId: string,
  ) {
    return this.unifiedProductsService.selectSupplier(id, supplierProductId);
  }

  /**
   * Update profit margin
   */
  @Patch(':id/margin')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  updateMargin(
    @Param('id') id: string,
    @Body('profitMarginPercent') profitMarginPercent: number,
  ) {
    return this.unifiedProductsService.updateMargin(id, profitMarginPercent);
  }

  /**
   * Refresh cost from selected supplier
   */
  @Post(':id/refresh-cost')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  refreshCost(@Param('id') id: string) {
    return this.unifiedProductsService.refreshCost(id);
  }

  /**
   * Link a supplier product
   */
  @Post(':id/link/:supplierProductId')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  linkSupplierProduct(
    @Param('id') id: string,
    @Param('supplierProductId') supplierProductId: string,
  ) {
    return this.unifiedProductsService.linkSupplierProduct(id, supplierProductId);
  }

  /**
   * Unlink a supplier product
   */
  @Delete(':id/unlink/:supplierProductId')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  async unlinkSupplierProduct(
    @Param('id') id: string,
    @Param('supplierProductId') supplierProductId: string,
  ) {
    await this.unifiedProductsService.unlinkSupplierProduct(id, supplierProductId);
    return { message: 'Producto de proveedor desvinculado' };
  }

  // ─── Mapping Suggestions ───

  /**
   * Get mapping suggestions for unmapped supplier products
   */
  @Get('mapping/suggestions')
  @RequirePermissions(Permission.PRODUCTS_READ)
  getSuggestions(
    @Query('supplierId') supplierId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.mappingSuggesterService.getSuggestionsForUnmapped(
      supplierId,
      limit || 50,
    );
  }

  /**
   * Get suggestions for a specific supplier product
   */
  @Get('mapping/suggestions/:supplierProductId')
  @RequirePermissions(Permission.PRODUCTS_READ)
  getSuggestionsForProduct(@Param('supplierProductId') supplierProductId: string) {
    return this.mappingSuggesterService.getSuggestionsForProduct(supplierProductId);
  }

  /**
   * Auto-map by exact SKU match
   */
  @Post('mapping/auto-map')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  autoMapByExactSku(@Query('supplierId') supplierId?: string) {
    return this.mappingSuggesterService.autoMapByExactSku(supplierId);
  }

  /**
   * Create unified products from unmapped supplier products
   */
  @Post('mapping/create-from-unmapped')
  @RequirePermissions(Permission.PRODUCTS_CREATE)
  createFromUnmapped(
    @Body('supplierProductIds') supplierProductIds: string[],
    @Body('defaultMargin') defaultMargin?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.mappingSuggesterService.createUnifiedFromUnmapped(
      supplierProductIds,
      defaultMargin || 30,
      userId,
    );
  }
}
