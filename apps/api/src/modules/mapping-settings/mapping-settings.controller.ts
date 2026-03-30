import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MappingSettingsService } from './mapping-settings.service';
import { UpdateMappingSettingsDto } from './dto/update-mapping-settings.dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('mapping-settings')
@UseGuards(RolesGuard)
export class MappingSettingsController {
  constructor(private readonly settingsService: MappingSettingsService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCTS_READ)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @RequirePermissions(Permission.PRODUCTS_UPDATE)
  updateSettings(
    @Body() dto: UpdateMappingSettingsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.updateSettings(dto, userId);
  }
}
