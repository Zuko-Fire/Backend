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
  Logger,
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
  private readonly logger = new Logger(NSPDController.name);

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
    try {
      return await this.nspdService.getLayers();
    } catch (error: any) {
      this.logger.warn(`getLayers failed: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения слоёв: ${error?.message ?? 'неизвестная ошибка'}`);
    }
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
    try {
      const layer = await this.nspdService.getLayerInfo(layerId);
      if (!layer) {
        throw new BadRequestException('Слой не найден');
      }
      return layer;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`getLayerInfo failed layerId=${layerId}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения слоя: ${error?.message ?? 'неизвестная ошибка'}`);
    }
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
    try {
      const legend = await this.nspdService.getLayerLegend(layerId);
      if (!legend) {
        throw new BadRequestException('Не удалось получить легенду слоя');
      }
      return legend;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`getLayerLegend failed layerId=${layerId}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения легенды: ${error?.message ?? 'неизвестная ошибка'}`);
    }
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
  @ApiResponse({ status: 400, description: 'Неверные параметры BBox' })
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
    if (isNaN(bbox.minLng) || isNaN(bbox.minLat) || isNaN(bbox.maxLng) || isNaN(bbox.maxLat)) {
      throw new BadRequestException('Неверные параметры BBox (minLng, minLat, maxLng, maxLat должны быть числами)');
    }
    const width = widthStr ? parseInt(widthStr, 10) : 1024;
    const height = heightStr ? parseInt(heightStr, 10) : 1024;
    return {
      url: this.nspdService.getMapImageUrl(
        parseInt(layerId, 10),
        [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
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
  @ApiResponse({ status: 400, description: 'Неверные параметры BBox' })
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
    if (isNaN(bbox.minLng) || isNaN(bbox.minLat) || isNaN(bbox.maxLng) || isNaN(bbox.maxLat)) {
      throw new BadRequestException('Неверные параметры BBox (minLng, minLat, maxLng, maxLat должны быть числами)');
    }
    const width = widthStr ? parseInt(widthStr, 10) : 1024;
    const height = heightStr ? parseInt(heightStr, 10) : 1024;
    try {
      const image = await this.nspdService.getMapImage(
        parseInt(layerId, 10),
        [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
        width,
        height,
      );
      if (!image) {
        throw new BadRequestException('Не удалось получить изображение карты');
      }
      res.setHeader('Content-Type', 'image/png');
      res.send(image);
    } catch (error: any) {
      this.logger.warn(`getMapImage failed: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения карты: ${error?.message ?? 'неизвестная ошибка'}`);
    }
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
    try {
      return await this.searchService.search(query, theme as ThemeId);
    } catch (error: any) {
      this.logger.warn(`NSPD search failed for "${query}": ${error?.message ?? error}`);
      return [];
    }
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
    try {
      return await this.searchService.searchInLayer(query, parseInt(layerId, 10));
    } catch (error: any) {
      this.logger.warn(`NSPD searchInLayer failed for layer ${layerId}: ${error?.message ?? error}`);
      return [];
    }
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

    try {
      return await this.searchService.searchAtPoint(
        latNum,
        lngNum,
        layerIdNum,
        layerName,
      );
    } catch (error: any) {
      this.logger.warn(
        `searchAtPoint failed for layer ${layerIdNum} at (${latNum},${lngNum}): ${error?.message ?? error}`,
      );
      return [];
    }
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

    try {
      return await this.searchService.searchInContourIter(
        geometry,
        layerNodes,
        body.onlyIntersects,
      );
    } catch (error: any) {
      this.logger.warn(`searchInContour failed: ${error?.message ?? error}`);
      return [];
    }
  }

  // ==================== Tab Data Endpoints ====================

  @Get('tab/land-parts/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Части ЗУ"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив частей ЗУ' })
  @ApiResponse({ status: 400, description: 'Неверный geomId или categoryId' })
  @ApiResponse({ status: 502, description: 'Ошибка NSPD сервера' })
  async tabLandParts(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    const geomIdNum = parseInt(geomId, 10);
    const catIdNum = parseInt(categoryId, 10);
    if (isNaN(geomIdNum) || isNaN(catIdNum)) {
      throw new BadRequestException('Неверный geomId или categoryId');
    }
    try {
      return await this.tabService.tabLandParts(geomIdNum, catIdNum);
    } catch (error: any) {
      this.logger.warn(`tabLandParts failed geomId=${geomIdNum}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения частей ЗУ: ${error?.message ?? 'неизвестная ошибка'}`);
    }
  }

  @Get('tab/land-links/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Связанные ЗУ"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив связанных ЗУ' })
  @ApiResponse({ status: 400, description: 'Неверный geomId или categoryId' })
  async tabLandLinks(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    const geomIdNum = parseInt(geomId, 10);
    const catIdNum = parseInt(categoryId, 10);
    if (isNaN(geomIdNum) || isNaN(catIdNum)) {
      throw new BadRequestException('Неверный geomId или categoryId');
    }
    try {
      return await this.tabService.tabLandLinks(geomIdNum, catIdNum);
    } catch (error: any) {
      this.logger.warn(`tabLandLinks failed geomId=${geomIdNum}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения связанных ЗУ: ${error?.message ?? 'неизвестная ошибка'}`);
    }
  }

  @Get('tab/permission-type/:geomId')
  @ApiOperation({
    summary: 'Получить данные вкладки "Виды разрешенного использования"',
  })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив видов использования' })
  @ApiResponse({ status: 400, description: 'Неверный geomId или categoryId' })
  async tabPermissionType(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    const geomIdNum = parseInt(geomId, 10);
    const catIdNum = parseInt(categoryId, 10);
    if (isNaN(geomIdNum) || isNaN(catIdNum)) {
      throw new BadRequestException('Неверный geomId или categoryId');
    }
    try {
      return await this.tabService.tabPermissionType(geomIdNum, catIdNum);
    } catch (error: any) {
      this.logger.warn(`tabPermissionType failed geomId=${geomIdNum}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения видов использования: ${error?.message ?? 'неизвестная ошибка'}`);
    }
  }

  @Get('tab/composition-land/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Состав ЕЗП"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив состава ЕЗП' })
  @ApiResponse({ status: 400, description: 'Неверный geomId или categoryId' })
  async tabCompositionLand(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    const geomIdNum = parseInt(geomId, 10);
    const catIdNum = parseInt(categoryId, 10);
    if (isNaN(geomIdNum) || isNaN(catIdNum)) {
      throw new BadRequestException('Неверный geomId или categoryId');
    }
    try {
      return await this.tabService.tabCompositionLand(geomIdNum, catIdNum);
    } catch (error: any) {
      this.logger.warn(`tabCompositionLand failed geomId=${geomIdNum}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения состава ЕЗП: ${error?.message ?? 'неизвестная ошибка'}`);
    }
  }

  @Get('tab/build-parts/:geomId')
  @ApiOperation({ summary: 'Получить данные вкладки "Части ОКС"' })
  @ApiParam({ name: 'geomId', type: Number })
  @ApiQuery({ name: 'categoryId', type: Number })
  @ApiResponse({ status: 200, description: 'Массив частей ОКС' })
  @ApiResponse({ status: 400, description: 'Неверный geomId или categoryId' })
  async tabBuildParts(
    @Param('geomId') geomId: string,
    @Query('categoryId') categoryId: string,
  ) {
    const geomIdNum = parseInt(geomId, 10);
    const catIdNum = parseInt(categoryId, 10);
    if (isNaN(geomIdNum) || isNaN(catIdNum)) {
      throw new BadRequestException('Неверный geomId или categoryId');
    }
    try {
      return await this.tabService.tabBuildParts(geomIdNum, catIdNum);
    } catch (error: any) {
      this.logger.warn(`tabBuildParts failed geomId=${geomIdNum}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения частей ОКС: ${error?.message ?? 'неизвестная ошибка'}`);
    }
  }

  @Get('tab/objects')
  @ApiOperation({
    summary: 'Получить данные вкладки "Объекты" (без координат)',
  })
  @ApiQuery({ name: 'objdocId', type: Number })
  @ApiQuery({ name: 'registersId', type: Number })
  @ApiResponse({ status: 200, description: 'Словарь объектов по регистрам' })
  @ApiResponse({ status: 400, description: 'Неверный objdocId или registersId' })
  async tabObjectsList(
    @Query('objdocId') objdocId: string,
    @Query('registersId') registersId: string,
  ) {
    const objDocId = parseInt(objdocId, 10);
    const regId = parseInt(registersId, 10);
    if (isNaN(objDocId) || isNaN(regId)) {
      throw new BadRequestException('Неверный objdocId или registersId');
    }
    try {
      return await this.tabService.tabObjectsList(objDocId, regId);
    } catch (error: any) {
      this.logger.warn(`tabObjectsList failed objdocId=${objDocId}: ${error?.message ?? error}`);
      throw new BadRequestException(`Ошибка получения объектов: ${error?.message ?? 'неизвестная ошибка'}`);
    }
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
