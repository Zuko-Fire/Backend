import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  ParseIntPipe,
  Res,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { NSPDLayerConfig } from './nspd.service';
import { NSPDService } from './nspd.service';
import { NSPDSearchService } from './nspd/nspd.search.service';
import { NSPDTabService } from './nspd/nspd.tab.service';
import { ThemeId, BoundingBox } from './nspd/nspd.types';

/** DTO для поиска в контуре */
interface SearchContourDto {
  coordinates: number[][][][];
  onlyIntersects?: boolean;
}

@ApiTags('NSPD')
@ApiBearerAuth('access-token')
@Controller('projects/nspd')
export class NSPDController {
  constructor(
    private readonly nspdService: NSPDService,
    private readonly searchService: NSPDSearchService,
    private readonly tabService: NSPDTabService,
  ) {}

  // ==================== Layers ====================

  @Get('layers')
  @ApiOperation({
    summary: 'Получить список слоев НСПД',
    description:
      'Возвращает все доступные слои Национальной Системы Пространственных Данных',
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

  // ==================== Search Endpoints ====================

  @Get('search')
  @ApiOperation({ summary: 'Поиск объектов по query' })
  @ApiQuery({ name: 'query', type: String })
  @ApiQuery({ name: 'themeId', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Массив найденных объектов' })
  async search(
    @Query('query') query: string,
    @Query('themeId') themeId?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }
    const theme = themeId ? parseInt(themeId, 10) : ThemeId.REAL_ESTATE_OBJECTS;
    return this.searchService.search(query, theme as ThemeId);
  }

  @Get('search/layer')
  @ApiOperation({ summary: 'Поиск в конкретном слое' })
  @ApiQuery({ name: 'query', type: String })
  @ApiQuery({ name: 'layerId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив найденных объектов' })
  async searchInLayer(
    @Query('query') query: string,
    @Query('layerId') layerId: string,
  ) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }
    return this.searchService.searchInLayer(query, parseInt(layerId, 10));
  }

  @Get('search/at-point')
  @ApiOperation({
    summary: 'Поиск объектов по координатам (WMS GetFeatureInfo)',
  })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'layerId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив найденных объектов' })
  async searchAtPoint(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('layerId') layerId: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const layerIdNum = parseInt(layerId, 10);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(layerIdNum)) {
      throw new BadRequestException('Invalid lat, lng, or layerId');
    }

    const layerInfo = await this.nspdService.getLayerInfo(layerIdNum);
    const layerName = layerInfo?.name ?? String(layerIdNum);

    return this.searchService.searchAtPoint(
      latNum,
      lngNum,
      layerIdNum,
      layerName,
    );
  }

  @Post('search/contour')
  @ApiOperation({ summary: 'Поиск объектов в контуре (полигоне)' })
  @ApiQuery({
    name: 'layerIds',
    type: String,
    description: 'Комma-separated layer IDs',
  })
  @ApiResponse({ status: 200, description: 'Массив найденных объектов' })
  async searchInContour(
    @Body() body: SearchContourDto,
    @Query('layerIds') layerIds: string,
  ) {
    if (!body.coordinates) {
      throw new BadRequestException('coordinates body is required');
    }
    if (!layerIds) {
      throw new BadRequestException('layerIds query param is required');
    }

    const layerIdList = layerIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (layerIdList.length === 0) {
      throw new BadRequestException('At least one valid layerId is required');
    }

    const layers = await this.nspdService.getLayers();
    const layerNodes = layers
      .filter((l) => layerIdList.includes(l.id))
      .map((l) => l.layerMeta!)
      .filter((m): m is NonNullable<typeof m> => m !== undefined);

    if (layerNodes.length === 0) {
      throw new BadRequestException('No valid layers found for given IDs');
    }

    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: body.coordinates,
    };

    return this.searchService.searchInContourIter(
      geometry,
      layerNodes,
      body.onlyIntersects,
    );
  }

  // ==================== Tab Data Endpoints ====================

  @Get('tab/land-parts/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Части ЗУ"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив частей ЗУ' })
  async tabLandParts(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.tabService.tabLandParts(
      parseInt(geomId, 10),
      parseInt(categoryId, 10),
    );
  }

  @Get('tab/land-links/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Связанные ЗУ"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив связанных ЗУ' })
  async tabLandLinks(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.tabService.tabLandLinks(
      parseInt(geomId, 10),
      parseInt(categoryId, 10),
    );
  }

  @Get('tab/permission-type/:geomId')
  @ApiOperation({
    summary: 'Получить данные вкладки "Виды разрешенного использования"',
  })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив видов использования' })
  async tabPermissionType(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.tabService.tabPermissionType(
      parseInt(geomId, 10),
      parseInt(categoryId, 10),
    );
  }

  @Get('tab/composition-land/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Состав ЕЗП"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив состава ЕЗП' })
  async tabCompositionLand(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.tabService.tabCompositionLand(
      parseInt(geomId, 10),
      parseInt(categoryId, 10),
    );
  }

  @Get('tab/build-parts/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Части ОКС"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив частей ОКС' })
  async tabBuildParts(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.tabService.tabBuildParts(
      parseInt(geomId, 10),
      parseInt(categoryId, 10),
    );
  }

  @Get('tab/objects')
  @ApiOperation({
    summary: 'Получить данные вкладки "Объекты" (без координат)',
  })
  @ApiQuery({ name: 'objdocId', type: Number })
  @ApiQuery({ name: 'registersId', type: Number })
  @ApiResponse({ status: 200, description: 'Словарь объектов по регистрам' })
  async tabObjectsList(
    @Query('objdocId') objdocId: string,
    @Query('registersId') registersId: string,
  ) {
    return this.tabService.tabObjectsList(
      parseInt(objdocId, 10),
      parseInt(registersId, 10),
    );
  }

  // ==================== Coordinate Conversion ====================

  @Get('coords/convert')
  @ApiOperation({
    summary: 'Конвертация координат',
    description:
      'Конвертирует координаты между EPSG:4326 (lat/lon) и EPSG:3857 (Web Mercator)',
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
