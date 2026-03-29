import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { RequirePermissions } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('suppliers')
@UseGuards(RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get('active')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findActive() {
    return this.suppliersService.findActive();
  }

  @Get(':id')
  @RequirePermissions(Permission.SUPPLIERS_READ)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  create(@Body() dto: CreateSupplierDto, @Req() req: any) {
    const userId = req.user?.sub;
    return this.suppliersService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SUPPLIERS_MANAGE)
  async delete(@Param('id') id: string) {
    await this.suppliersService.delete(id);
    return { message: 'Proveedor eliminado' };
  }
}
