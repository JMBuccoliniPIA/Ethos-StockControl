import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subfamily, SubfamilySchema } from './schemas/subfamily.schema';
import { SubfamiliesService } from './subfamilies.service';
import { SubfamiliesController } from './subfamilies.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subfamily.name, schema: SubfamilySchema },
    ]),
  ],
  controllers: [SubfamiliesController],
  providers: [SubfamiliesService],
  exports: [SubfamiliesService],
})
export class SubfamiliesModule {}
