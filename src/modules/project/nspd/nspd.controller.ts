// src/modules/project/nspd/nspd.controller.ts
// REST API контроллер для работы с НСПД

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { NSPDService } from './nspd.service';
import { NSPDSearchService } from './nspd.search.service';
import { NSPDTabService } from './nspd.tab.service';
import { ThemeId, BoundingBox } from './nspd.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

/** DTO для поиска в контуре */
interface SearchContourDto {
  coordinates: number[][][][];
  onlyIntersects?: boolean;
}

@ApiTags('NSPD')
@Controller('projects/nspd')
export class NSPDController {
  private readonly logger = new Logger(NSPDController.name);

  constructor(
    private readonly nspdService: NSPDService,
    private readonly searchService: NSPDSearchService,
    private readonly tabService: NSPDTabService,
  ) {}

  // ==================== Layer Endpoints ====================

  @Get('layers')
  @ApiOperation({ summary: 'Получить все слои НСПД' })
  @ApiResponse({ status: 200, description: 'Список слоёв' })
  async getLayers() {
    return this.nspdService.getLayers();
  }

  @Get('layers/:layerId')
  @ApiOperation({ summary: 'Получить информацию о слое по ID' })
  @ApiParam({ name: 'layerId', type: Number })
  @ApiResponse({ status: 200, description: 'Информация о слое' })
  @ApiResponse({ status: 404, description: 'Слой не найден' })
  async getLayerInfo(@Param('layerId') layerId: string) {
    const id = parseInt(layerId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid layerId');
    }
    const info = await this.nspdService.getLayerInfo(id);
    if (!info) {
      throw new BadRequestException(`Layer ${id} not found`);
    }
    return info;
  }

  @Get('layers/:layerId/legend')
  @ApiOperation({ summary: 'Получить легенду слоя' })
  @ApiParam({ name: 'layerId', type: Number })
  @ApiResponse({ status: 200, description: 'Легенда слоя (SVG)' })
  async getLayerLegend(
    @Param('layerId') layerId: string,
    @Res() res: Response,
  ) {
    const id = parseInt(layerId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid layerId');
    }
    const legend = await this.nspdService.getLayerLegend(id);
    if (!legend) {
      throw new BadRequestException(`Legend for layer ${id} not found`);
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(legend);
  }

  // ==================== Map Image Endpoints ====================

  @Get('map/url')
  @ApiOperation({ summary: 'Получить URL WMS-карты' })
  @ApiQuery({ name: 'layerId', type: Number })
  @ApiQuery({ name: 'minLng', type: Number })
  @ApiQuery({ name: 'minLat', type: Number })
  @ApiQuery({ name: 'maxLng', type: Number })
  @ApiQuery({ name: 'maxLat', type: Number })
  @ApiQuery({ name: 'width', type: Number, required: false })
  @ApiQuery({ name: 'height', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'URL карты' })
  async getMapUrl(
    @Query('layerId') layerId: string,
    @Query('minLng') minLng: string,
    @Query('minLat') minLat: string,
    @Query('maxLng') maxLng: string,
    @Query('maxLat') maxLat: string,
    @Query('width') widthStr?: string,
    @Query('height') heightStr?: string,
  ) {
    const bbox: BoundingBox = {
      minLng: parseFloat(minLng),
      minLat: parseFloat(minLat),
      maxLng: parseFloat(maxLng),
      maxLat: parseFloat(maxLat),
    };
    const width = widthStr ? parseInt(widthStr, 10) : 1024;
    const height = heightStr ? parseInt(heightStr, 10) : 1024;
    return {
      url: this.nspdService.getMapImageUrl(
        parseInt(layerId, 10),
        bbox,
        width,
        height,
      ),
    };
  }

  @Get('map')
  @ApiOperation({ summary: 'Получить WMS-карту как изображение' })
  @ApiQuery({ name: 'layerId', type: Number })
  @ApiQuery({ name: 'minLng', type: Number })
  @ApiQuery({ name: 'minLat', type: Number })
  @ApiQuery({ name: 'maxLng', type: Number })
  @ApiQuery({ name: 'maxLat', type: Number })
  @ApiQuery({ name: 'width', type: Number, required: false })
  @ApiQuery({ name: 'height', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'PNG изображение карты' })
  async getMapImage(
    @Query('layerId') layerId: string,
    @Query('minLng') minLng: string,
    @Query('minLat') minLat: string,
    @Query('maxLng') maxLng: string,
    @Query('maxLat') maxLat: string,
    @Res() res: Response,
    @Query('width') widthStr?: string,
    @Query('height') heightStr?: string,
  ) {
    const bbox: BoundingBox = {
      minLng: parseFloat(minLng),
      minLat: parseFloat(minLat),
      maxLng: parseFloat(maxLng),
      maxLat: parseFloat(maxLat),
    };
    const width = widthStr ? parseInt(widthStr, 10) : 1024;
    const height = heightStr ? parseInt(heightStr, 10) : 1024;
    const image = await this.nspdService.getMapImage(
      parseInt(layerId, 10),
      bbox,
      width,
      height,
    );
    if (!image) {
      throw new BadRequestException('Failed to fetch map image');
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(image);
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
  @ApiResponse({ status: 200, description: 'Массив частей ЗУ' })
  async tabLandParts(@Param('geomId') geomId: string) {
    return this.tabService.tabLandParts(parseInt(geomId, 10));
  }

  @Get('tab/land-links/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Связанные ЗУ"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив связанных ЗУ' })
  async tabLandLinks(@Param('geomId') geomId: string) {
    return this.tabService.tabLandLinks(parseInt(geomId, 10));
  }

  @Get('tab/permission-type/:geomId')
  @ApiOperation({
    summary: 'Получить данные вкладки "Виды разрешенного использования"',
  })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив видов использования' })
  async tabPermissionType(@Param('geomId') geomId: string) {
    return this.tabService.tabPermissionType(parseInt(geomId, 10));
  }

  @Get('tab/composition-land/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Состав ЕЗП"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив состава ЕЗП' })
  async tabCompositionLand(@Param('geomId') geomId: string) {
    return this.tabService.tabCompositionLand(parseInt(geomId, 10));
  }

  @Get('tab/build-parts/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Части ОКС"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив частей ОКС' })
  async tabBuildParts(@Param('geomId') geomId: string) {
    return this.tabService.tabBuildParts(parseInt(geomId, 10));
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
  @ApiOperation({ summary: 'Конвертация координат EPSG:4326 <-> EPSG:3857' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiResponse({ status: 200, description: 'Конвертированные координаты' })
  async convertCoords(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      throw new BadRequestException('Invalid lat or lng');
    }

    const mercator = this.nspdService.latLonToWebMercator(latNum, lngNum);
    const back = this.nspdService.webMercatorToLatLon(mercator.x, mercator.y);

    return {
      input: { lat: latNum, lng: lngNum },
      webMercator: mercator,
      backToLatLon: back,
    };
  }

  // ==================== Cache Management ====================

  @Get('cache/stats')
  @ApiOperation({ summary: 'Статистика кэша НСПД' })
  @ApiResponse({ status: 200, description: 'Статистика кэша' })
  async getCacheStats() {
    return {
      layers: this.nspdService.getLayerCacheSize(),
      legends: this.nspdService.getLegendCacheSize(),
      http: this.nspdService.getCacheTTL(),
      ttlMs: this.nspdService.getCacheTTL(),
    };
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Очистить все кэши НСПД' })
  @ApiResponse({ status: 200, description: 'Кэш очищен' })
  async clearCache() {
    this.nspdService.clearCache();
    return { message: 'NSPD cache cleared' };
  }
}
