import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandCategory } from './entities/land-category.entity';
import { PermittedUse } from './entities/permitted-use.entity';
import { BoundaryMarkerType } from './entities/boundary-marker-type.entity';
import { PrecisionStandard } from './entities/precision-standard.entity';

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectRepository(LandCategory)
    private landCategoryRepo: Repository<LandCategory>,
    @InjectRepository(PermittedUse)
    private permittedUseRepo: Repository<PermittedUse>,
    @InjectRepository(BoundaryMarkerType)
    private boundaryMarkerTypeRepo: Repository<BoundaryMarkerType>,
    @InjectRepository(PrecisionStandard)
    private precisionStandardRepo: Repository<PrecisionStandard>,
  ) {}

  // ==================== Land Categories ====================

  async findAllLandCategories() {
    return this.landCategoryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createLandCategory(data: {
    name: string;
    code?: string;
    description?: string;
  }) {
    await this.ensureUnique(this.landCategoryRepo, { name: data.name });

    const category = this.landCategoryRepo.create({
      ...data,
      isActive: true,
    });
    return this.landCategoryRepo.save(category);
  }

  // ==================== Permitted Uses ====================

  async findAllPermittedUses(landCategoryId?: number) {
    const where: Record<string, unknown> = { isActive: true };
    if (landCategoryId) {
      where.landCategoryId = landCategoryId;
    }
    return this.permittedUseRepo.find({ where, order: { name: 'ASC' } });
  }

  async createPermittedUse(data: {
    name: string;
    landCategoryId?: number;
    description?: string;
  }) {
    await this.ensureUnique(this.permittedUseRepo, { name: data.name });

    const use = this.permittedUseRepo.create({ ...data, isActive: true });
    return this.permittedUseRepo.save(use);
  }

  // ==================== Boundary Marker Types ====================

  async findAllBoundaryMarkerTypes() {
    return this.boundaryMarkerTypeRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createBoundaryMarkerType(data: {
    name: string;
    description?: string;
    materialRequirements?: string;
  }) {
    await this.ensureUnique(
      this.boundaryMarkerTypeRepo,
      { name: data.name },
      'Boundary marker type',
    );

    const marker = this.boundaryMarkerTypeRepo.create({
      ...data,
      isActive: true,
    });
    return this.boundaryMarkerTypeRepo.save(marker);
  }

  // ==================== Precision Standards ====================

  async findAllPrecisionStandards() {
    return this.precisionStandardRepo.find({
      where: { isActive: true },
      order: { landCategory: 'ASC' },
    });
  }

  async getPrecisionStandardByCategory(landCategory: string) {
    const standard = await this.precisionStandardRepo.findOne({
      where: { landCategory, isActive: true },
    });
    if (!standard) {
      throw new NotFoundException(
        `Precision standard not found for category: ${landCategory}`,
      );
    }
    return standard;
  }

  async createPrecisionStandard(data: {
    landCategory: string;
    maxAccuracyMt: number;
    allowedAreaDeviation: number;
    allowedPerimeterDeviation: number;
    allowedPointDeviation: number;
    note?: string;
  }) {
    await this.ensureUnique(
      this.precisionStandardRepo,
      { landCategory: data.landCategory },
      'Precision standard',
    );

    const standard = this.precisionStandardRepo.create({
      ...data,
      isActive: true,
    });
    return this.precisionStandardRepo.save(standard);
  }

  // ==================== Initialize Defaults ====================

  async initializeDefaults() {
    await this.initLandCategories();
    await this.initPrecisionStandards();
  }

  // ==================== Private Helpers ====================

  /**
   * Ensures no duplicate record exists with the given where clause
   */
  private async ensureUnique(
    repo: Repository<any>,
    where: Record<string, string>,
    entityType = 'Item',
  ) {
    const existing = await repo.findOne({ where });
    if (existing) {
      throw new Error(`${entityType} already exists`);
    }
  }

  /**
   * Seeds default land categories
   */
  private async initLandCategories() {
    const defaults = [
      {
        name: 'Земли сельскохозяйственного назначения',
        code: '05000000000',
        description: 'Земли, предназначенные для ведения сельхозпроизводства',
      },
      {
        name: 'Земли населённых пунктов',
        code: '02000000000',
        description: 'Земли границ населённых пунктов',
      },
      {
        name: 'Земли промышленного назначения',
        code: '09000000000',
        description: 'Земли для промышленности, энергетики, транспорта',
      },
      {
        name: 'Земли особо охраняемых территорий',
        code: '15000000000',
        description: 'Земли с особыми требованиями к использованию',
      },
    ];

    for (const d of defaults) {
      const existing = await this.landCategoryRepo.findOne({
        where: { name: d.name },
      });
      if (!existing) {
        await this.landCategoryRepo.save({ ...d, isActive: true });
      }
    }
  }

  /**
   * Seeds default precision standards
   */
  private async initPrecisionStandards() {
    const defaults = [
      {
        landCategory: 'Земли сельскохозяйственного назначения',
        maxAccuracyMt: 2.5,
        allowedAreaDeviation: 0.05,
        allowedPerimeterDeviation: 0.1,
        allowedPointDeviation: 0.25,
        note: 'Согласно пособию Геодезические работы при землеустройстве, стр. 77',
      },
      {
        landCategory: 'Земли населённых пунктов',
        maxAccuracyMt: 1.0,
        allowedAreaDeviation: 0.02,
        allowedPerimeterDeviation: 0.05,
        allowedPointDeviation: 0.1,
        note: 'Повышенная точность для застроенных территорий',
      },
      {
        landCategory: 'Земли промышленного назначения',
        maxAccuracyMt: 1.0,
        allowedAreaDeviation: 0.02,
        allowedPerimeterDeviation: 0.05,
        allowedPointDeviation: 0.1,
        note: 'Повышенная точность для промышленных зон',
      },
    ];

    for (const d of defaults) {
      const existing = await this.precisionStandardRepo.findOne({
        where: { landCategory: d.landCategory },
      });
      if (!existing) {
        await this.precisionStandardRepo.save(d);
      }
    }
  }
}
