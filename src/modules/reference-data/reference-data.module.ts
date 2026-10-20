import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';
import { LandCategory } from './entities/land-category.entity';
import { PermittedUse } from './entities/permitted-use.entity';
import { BoundaryMarkerType } from './entities/boundary-marker-type.entity';
import { PrecisionStandard } from './entities/precision-standard.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LandCategory,
      PermittedUse,
      BoundaryMarkerType,
      PrecisionStandard,
    ]),
  ],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
