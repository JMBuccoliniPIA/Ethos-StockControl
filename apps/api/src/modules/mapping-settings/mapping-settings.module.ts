import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MappingSettings,
  MappingSettingsSchema,
} from './schemas/mapping-settings.schema';
import { MappingSettingsService } from './mapping-settings.service';
import { MappingSettingsController } from './mapping-settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MappingSettings.name, schema: MappingSettingsSchema },
    ]),
  ],
  controllers: [MappingSettingsController],
  providers: [MappingSettingsService],
  exports: [MappingSettingsService],
})
export class MappingSettingsModule {}
