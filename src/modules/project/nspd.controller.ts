import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseIntPipe,
  Res,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import type { NSPDLayerConfig } from './nspd.service';
import { NSPDService } from './nspd.service';

@ApiTags('NSPD')
@ApiBearerAuth('access-token')
@Controller('projects/nspd')
export class NSPDController {
  constructor(private readonly nspdService: NSPDService) {}

  // ==================== Layers ====================

  @Get('layers')
  @ApiOperation({
    summary: 'Получить список слоев НСПД',
    description: 'Возвращает все доступные слои Национальной Системы Пространственных Данных',
  })
  @ApiResponse({
    status: 200,
    description: 'Список слоев НСПД',
    example: [
      {
        id: 36048,
        name: 'Кадастровые участки',
        enabled: true,
        description: 'Границы земельных участков',
      },
      {
        id: 36071,
        name: 'Кадастровые округа',
        enabled: true,
        description: 'Границы кадастровых округов',
      },
    ],
  })
  async getLayers() {
    return this.nspdService.getLayers();
  }

  @Get('layers/:layerId')
  @ApiOperation({
    summary: 'Получить информацию о слое НСПД',
    description: 'Возвращает детальную информацию о конкретном слое',
  })
  @ApiParam({
    name: 'layerId',
    type: Number,
    description: 'ID слоя',
    example: 36048,
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о слое',
  })
  @ApiResponse({ status: 404, description: 'Слой не найден' })
  async getLayerInfo(@Param('layerId', ParseIntPipe) layerId: number) {
    const layer = await this.nspdService.getLayerInfo(layerId);
    if (!layer) {
      throw new BadRequestException('Слой не найден');
    }
    return layer;
  }

  @Get('layers/:layerId/legend')
  @ApiOperation({
    summary: 'Получить легенду слоя',
    description: 'Возвращает metadata и стиль слоя в формате JSON',
  })
  @ApiParam({
    name: 'layerId',
    type: Number,
    description: 'ID слоя',
    example: 36048,
  })
  @ApiResponse({
    status: 200,
    description: 'Легенда слоя',
    content: { 'application/json': {} },
  })
  async getLayerLegend(@Param('layerId', ParseIntPipe) layerId: number) {
    const legend = await this.nspdService.getLayerLegend(layerId);
    if (!legend) {
      throw new BadRequestException('Не удалось получить легенду слоя');
    }
    return legend;
  }

  // ==================== Map Images ====================

  @Get('map')
  @ApiOperation({
    summary: 'Получить изображение слоя НСПД',
    description:
      'Возвращает PNG изображение указанного слоя НСПД для заданной области',
  })
  @ApiQuery({
    name: 'layer',
    required: false,
    type: Number,
    description: 'ID слоя',
    example: 36048,
  })
  @ApiQuery({
    name: 'bbox',
    required: false,
    type: String,
    description: 'Границы в lat/lon (minLon,minLat,maxLon,maxLat)',
    example: '37.5,55.7,37.7,55.8',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    type: Number,
    description: 'Ширина изображения',
    example: 512,
  })
  @ApiQuery({
    name: 'height',
    required: false,
    type: Number,
    description: 'Высота изображения',
    example: 512,
  })
  @ApiResponse({
    status: 200,
    description: 'PNG изображение карты',
    content: { 'image/png': {} },
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры' })
  async getMapImage(
    @Query('layer') layerId = 36048,
    @Query('bbox') bbox = '37.5,55.7,37.7,55.8',
    @Query('width') width = 512,
    @Query('height') height = 512,
    @Res({ passthrough: true }) res: Response,
  ) {
    const bboxParts = bbox.split(',').map(Number);
    if (bboxParts.length !== 4 || bboxParts.some((n) => isNaN(n))) {
      throw new BadRequestException(
        'Некорректный bbox. Формат: minLon,minLat,maxLon,maxLat',
      );
    }

    const mercatorBbox = this.nspdService.createMercatorBbox(
      bboxParts[1], // minLat
      bboxParts[0], // minLon
      bboxParts[3], // maxLat
      bboxParts[2], // maxLon
    );

    const image = await this.nspdService.getMapImage(
      layerId,
      mercatorBbox,
      width,
      height,
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', image.length.toString());
    res.status(HttpStatus.OK).send(image);
  }

  /**
   * Получить URL изображения (без скачивания)
   */
  @Get('map/url')
  @ApiOperation({
    summary: 'Получить URL изображения НСПД',
    description:
      'Возвращает прямую ссылку на изображение слоя НСПД (не скачивает)',
  })
  @ApiQuery({
    name: 'layer',
    required: false,
    type: Number,
    description: 'ID слоя',
    example: 36048,
  })
  @ApiQuery({
    name: 'bbox',
    required: false,
    type: String,
    description: 'Границы в lat/lon (minLon,minLat,maxLon,maxLat)',
    example: '37.5,55.7,37.7,55.8',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    type: Number,
    description: 'Ширина',
    example: 512,
  })
  @ApiQuery({
    name: 'height',
    required: false,
    type: Number,
    description: 'Высота',
    example: 512,
  })
  @ApiResponse({
    status: 200,
    description: 'URL изображения',
    example: {
      imageUrl: 'https://nspd.gov.ru/api/aeggis/v4/36048/wms?SERVICE=WMS&...',
      layerId: 36048,
      bbox: [7804891, 8181287, 7820000, 8195000],
    },
  })
  async getMapImageUrl(
    @Query('layer') layerId = 36048,
    @Query('bbox') bbox = '37.5,55.7,37.7,55.8',
    @Query('width') width = 512,
    @Query('height') height = 512,
  ) {
    const bboxParts = bbox.split(',').map(Number);
    if (bboxParts.length !== 4 || bboxParts.some((n) => isNaN(n))) {
      throw new BadRequestException(
        'Некорректный bbox. Формат: minLon,minLat,maxLon,maxLat',
      );
    }

    const mercatorBbox = this.nspdService.createMercatorBbox(
      bboxParts[1],
      bboxParts[0],
      bboxParts[3],
      bboxParts[2],
    );

    const imageUrl = this.nspdService.getMapImageUrl(
      layerId,
      mercatorBbox,
      width,
      height,
    );

    return {
      imageUrl,
      layerId,
      bbox: mercatorBbox,
      width,
      height,
    };
  }

  // ==================== Coordinate Conversion ====================

  @Get('coords/convert')
  @ApiOperation({
    summary: 'Конвертация координат',
    description: 'Конвертирует координаты между EPSG:4326 (lat/lon) и EPSG:3857 (Web Mercator)',
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    type: Number,
    description: 'Широта (EPSG:4326)',
    example: 55.7558,
  })
  @ApiQuery({
    name: 'lon',
    required: true,
    type: Number,
    description: 'Долгота (EPSG:4326)',
    example: 37.6173,
  })
  @ApiResponse({
    status: 200,
    description: 'Конвертированные координаты',
    example: {
      lat: 55.7558,
      lon: 37.6173,
      x: 4187652.123,
      y: 7567890.456,
    },
  })
  async convertCoordinates(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('Координаты должны быть числами');
    }

    const [x, y] = this.nspdService.latLonToWebMercator(lat, lon);

    return {
      lat,
      lon,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };
  }

  // ==================== Cache Management ====================

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Статистика кэша НСПД',
    description: 'Возвращает информацию о размере и количестве записей в кэше',
  })
  @ApiResponse({
    status: 200,
    description: 'Статистика кэша',
    example: {
      layers: { count: 3, ttlMs: 3600000 },
      legends: { count: 5, ttlMs: 3600000 },
    },
  })
  async getCacheStats() {
    return {
      layers: {
        count: this.nspdService.getLayerCacheSize(),
        ttlMs: this.nspdService.getCacheTTL(),
      },
      legends: {
        count: this.nspdService.getLegendCacheSize(),
        ttlMs: this.nspdService.getCacheTTL(),
      },
    };
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Очистить кэш НСПД',
    description: 'Очищает все кэшированные данные НСПД',
  })
  @ApiResponse({ status: 200, description: 'Кэш очищен' })
  async clearCache() {
    this.nspdService.clearCache();
    return { message: 'Кэш НСПД очищен' };
  }
}
