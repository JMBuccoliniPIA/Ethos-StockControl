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
import { SubfamiliesService } from './subfamilies.service';
import { CreateSubfamilyDto } from './dto/create-subfamily.dto';
import { UpdateSubfamilyDto } from './dto/update-subfamily.dto';
import { RequirePermissions } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('subfamilies')
@UseGuards(RolesGuard)
export class SubfamiliesController {
  constructor(private readonly subfamiliesService: SubfamiliesService) {}

  @Get()
  @RequirePermissions(Permission.FAMILIES_READ)
  findAll(@Query('familyId') familyId?: string) {
    if (familyId) {
      return this.subfamiliesService.findByFamily(familyId);
    }
    return this.subfamiliesService.findAll();
  }

  /** Returns nested tree structure for a family */
  @Get('tree/:familyId')
  @RequirePermissions(Permission.FAMILIES_READ)
  findTree(@Param('familyId') familyId: string) {
    return this.subfamiliesService.findTreeByFamily(familyId);
  }

  @Get(':id')
  @RequirePermissions(Permission.FAMILIES_READ)
  findOne(@Param('id') id: string) {
    return this.subfamiliesService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  create(@Body() dto: CreateSubfamilyDto) {
    return this.subfamiliesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSubfamilyDto) {
    return this.subfamiliesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  async delete(@Param('id') id: string) {
    await this.subfamiliesService.delete(id);
    return { message: 'Subfamilia eliminada' };
  }
}
