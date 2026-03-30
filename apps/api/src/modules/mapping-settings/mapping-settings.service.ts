import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MappingSettings,
  MappingSettingsDocument,
} from './schemas/mapping-settings.schema';
import { UpdateMappingSettingsDto } from './dto/update-mapping-settings.dto';

@Injectable()
export class MappingSettingsService {
  constructor(
    @InjectModel(MappingSettings.name)
    private settingsModel: Model<MappingSettingsDocument>,
  ) {}

  /**
   * Get current settings (creates default if not exists)
   */
  async getSettings(): Promise<MappingSettingsDocument> {
    let settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      settings = await this.settingsModel.create({ key: 'default' });
    }
    return settings;
  }

  /**
   * Update settings
   */
  async updateSettings(
    dto: UpdateMappingSettingsDto,
    userId?: string,
  ): Promise<MappingSettingsDocument> {
    const update: any = { ...dto };
    if (userId) {
      update.updatedBy = userId;
    }

    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      update,
      { new: true, upsert: true },
    );

    return settings;
  }

  /**
   * Check if auto-map is enabled
   */
  async isAutoMapEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.autoMapOnImport && settings.autoMapStrategy !== 'disabled';
  }
}
