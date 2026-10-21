import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import { ReferenceDataService } from './reference-data.service';

@ApiTags('Reference Data')
@ApiBearerAuth('access-token')
@Controller('reference')
@UseGuards(JwtAuthGuard)
export class ReferenceDataController {
  constructor(private referenceService: ReferenceDataService) {}

  // === Land Categories ===

  @Get('land-categories')
  @ApiOperation({ summary: 'Получить все категории земель' })
  @ApiResponse({ status: 200, description: 'Список категорий земель' })
  async getLandCategories() {
    return this.referenceService.findAllLandCategories();
  }

  @Post('land-categories')
  @ApiOperation({ summary: 'Создать категорию земель' })
  @ApiResponse({ status: 201, description: 'Категория создана' })
  async createLandCategory(
    @Body() data: { name: string; code?: string; description?: string },
  ) {
    return this.referenceService.createLandCategory(data);
  }

  // === Permitted Uses ===

  @Get('permitted-uses')
  @ApiOperation({ summary: 'Получить виды разрешенного использования' })
  @ApiResponse({ status: 200, description: 'Список ВРИ' })
  async getPermittedUses(@Query('landCategoryId') landCategoryId?: number) {
    return this.referenceService.findAllPermittedUses(landCategoryId);
  }

  @Post('permitted-uses')
  @ApiOperation({ summary: 'Создать вид разрешенного использования' })
  @ApiResponse({ status: 201, description: 'ВРИ создан' })
  async createPermittedUse(
    @Body()
    data: {
      name: string;
      landCategoryId?: number;
      description?: string;
    },
  ) {
    return this.referenceService.createPermittedUse(data);
  }

  // === Boundary Marker Types ===

  @Get('marker-types')
  @ApiOperation({ summary: 'Получить типы межевых знаков' })
  @ApiResponse({ status: 200, description: 'Список типов межевых знаков' })
  async getMarkerTypes() {
    return this.referenceService.findAllBoundaryMarkerTypes();
  }

  @Post('marker-types')
  @ApiOperation({ summary: 'Создать тип межевого знака' })
  @ApiResponse({ status: 201, description: 'Тип создан' })
  async createMarkerType(
    @Body()
    data: {
      name: string;
      description?: string;
      materialRequirements?: string;
    },
  ) {
    return this.referenceService.createBoundaryMarkerType(data);
  }

  // === Precision Standards ===

  @Get('precision-standards')
  @ApiOperation({ summary: 'Получить нормативы точности' })
  @ApiResponse({ status: 200, description: 'Список нормативов точности' })
  async getPrecisionStandards() {
    return this.referenceService.findAllPrecisionStandards();
  }

  @Get('precision-standards/:category')
  @ApiOperation({ summary: 'Получить норматив точности по категории земель' })
  @ApiResponse({ status: 200, description: 'Норматив точности' })
  async getPrecisionStandardByCategory(@Param('category') category: string) {
    return this.referenceService.getPrecisionStandardByCategory(category);
  }

  @Post('precision-standards')
  @ApiOperation({ summary: 'Создать норматив точности' })
  @ApiResponse({ status: 201, description: 'Норматив создан' })
  async createPrecisionStandard(
    @Body()
    data: {
      landCategory: string;
      maxAccuracyMt: number;
      allowedAreaDeviation: number;
      allowedPerimeterDeviation: number;
      allowedPointDeviation: number;
      note?: string;
    },
  ) {
    return this.referenceService.createPrecisionStandard(data);
  }
}
