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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCTS_READ)
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions(Permission.PRODUCTS_READ)
  getStats() {
    return this.productsService.getStats();
  }

  @Get('low-stock')
  @RequirePermissions(Permission.STOCK_READ)
  getLowStock() {
    return this.productsService.getLowStockProducts();
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCTS_READ)
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCTS_CREATE)
  create(@Body() dto: CreateProductDto, @CurrentUser('sub') userId: string) {
    return this.productsService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCTS_DELETE)
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { message: 'Producto eliminado' };
  }
}
