import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { RequirePermissions } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('families')
@UseGuards(RolesGuard)
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  @RequirePermissions(Permission.FAMILIES_READ)
  findAll() {
    return this.familiesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.FAMILIES_READ)
  findOne(@Param('id') id: string) {
    return this.familiesService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  create(@Body() dto: CreateFamilyDto) {
    return this.familiesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
    return this.familiesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.FAMILIES_MANAGE)
  async delete(@Param('id') id: string) {
    await this.familiesService.delete(id);
    return { message: 'Familia eliminada' };
  }
}
