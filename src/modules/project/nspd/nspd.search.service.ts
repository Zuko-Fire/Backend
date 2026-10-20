// src/modules/project/nspd/nspd.search.service.ts
// Сервис поиска объектов НСПД (вдохновлено pynspd)

import { Injectable, Logger } from '@nestjs/common';
import { NSPDClientService } from './nspd.client.service';
import {
  NspdFeature,
  NSPDSearchResponse,
  NSPDIntersectRequest,
  NSPDIntersectCategory,
  LayerNode,
  ThemeId,
  TabTitle,
  BoundingBox,
  Coordinates,
  GeoJSONGeometry,
} from './nspd.types';
import {
  UnknownLayerError,
  AmbiguousSearchError,
  TooBigContourError,
  PynspdNetworkError,
} from './nspd.errors';

/**
 * Размер тайла для разбиения больших контуров (в градусах, примерно 10x10 км)
 */
const TILE_SIZE_DEG = 0.1;

/**
 * Максимальная площадь контура для одного запроса (в квадратных градусах)
 */
const MAX_CONTOUR_AREA_SQ_DEG = 1.0;

/**
 * WMS GetFeatureInfo параметры
 */
const WMS_GETFEATUREINFO_PARAMS = {
  REQUEST: 'GetFeatureInfo' as const,
  SERVICE: 'WMS' as const,
  VERSION: '1.3.0' as const,
  INFO_FORMAT: 'application/json' as const,
  FEATURE_COUNT: 10,
  WIDTH: 512,
  HEIGHT: 512,
  CRS: 'EPSG:4326' as const,
  TRANSPARENT: true as const,
  EXCEPTIONS: 'application/json' as const,
};

/**
 * Преобразование координат lat/lng в пиксельные координаты для WMS
 */
function latLonToWmsPixel(
  lat: number,
  lng: number,
  width: number,
  height: number,
  bbox: BoundingBox,
): { i: number; j: number; x: number; y: number } {
  const xPercent = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng);
  const yPercent = 1 - (lat - bbox.minLat) / (bbox.maxLat - bbox.minLat);

  return {
    i: Math.round(xPercent * width),
    j: Math.round(yPercent * height),
    x: lng,
    y: lat,
  };
}

/**
 * Создание BoundingBox из lat/lng координат с радиусом
 */
function createBoundingBoxFromPoint(
  lat: number,
  lng: number,
  radiusDeg: number = 0.001,
): BoundingBox {
  return {
    minLng: lng - radiusDeg,
    minLat: lat - radiusDeg,
    maxLng: lng + radiusDeg,
    maxLat: lat + radiusDeg,
  };
}

/**
 * Проверка, что площадь контура не превышает лимит
 * Принимает Polygon или MultiPolygon coordinates
 */
function estimateAreaSqDeg(
  coordinates: number[][][] | number[][][][],
): number {
  // Простая оценка площади через min/max координаты
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  // Определяем, Polygon это или MultiPolygon
  if (Array.isArray(coordinates[0])) {
    const arr = coordinates as number[][][][];
    for (const polygon of arr) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  } else {
    const arr = coordinates as number[][][];
    for (const ring of arr) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return (maxLng - minLng) * (maxLat - minLat);
}

/**
 * Разбиение большого полигона на тайлы
 */
function tilePolygon(
  coordinates: number[][][] | number[][][][],
): BoundingBox[] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  // Определяем, Polygon это или MultiPolygon
  if (Array.isArray(coordinates[0])) {
    const arr = coordinates as number[][][][];
    for (const polygon of arr) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  } else {
    const arr = coordinates as number[][][];
    for (const ring of arr) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  const tiles: BoundingBox[] = [];
  for (let lng = minLng; lng < maxLng; lng += TILE_SIZE_DEG) {
    for (let lat = minLat; lat < maxLat; lat += TILE_SIZE_DEG) {
      tiles.push({
        minLng: lng,
        minLat: lat,
        maxLng: lng + TILE_SIZE_DEG,
        maxLat: lat + TILE_SIZE_DEG,
      });
    }
  }

  return tiles;
}

/**
 * Преобразование GeoJSON FeatureCollection в NSPD Intersect формат
 */
function toIntersectCategories(
  layerNodes: LayerNode[],
  geometry: { type: string; coordinates: number[][][][] },
): NSPDIntersectCategory[] {
  return layerNodes.map((node) => ({
    categories: [node.categoryId],
    geom: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: geometry as any,
          properties: {},
        },
      ],
    },
  }));
}

/**
 * Сервис поиска объектов НСПД.
 * Реализует методы поиска из pynspd:
 * - search / searchInLayer / searchInLayers - текстовый поиск
 * - find / findInLayer - поиск одного объекта
 * - searchAtPoint / searchAtCoords - поиск по точке (WMS GetFeatureInfo)
 * - searchInContour / searchInContourIter - поиск по контуру (полигон)
 */
@Injectable()
export class NSPDSearchService {
  private readonly logger = new Logger(NSPDSearchService.name);
  private readonly client: NSPDClientService;

  constructor(nspdClient: NSPDClientService) {
    this.client = nspdClient;
  }

  // ==================== Text Search ====================

  /**
   * Поиск объектов по запросу с указанием темы.
   * Возвращает массив найденных объектов.
   */
  async search(
    query: string,
    themeId: ThemeId = ThemeId.REAL_ESTATE_OBJECTS,
  ): Promise<NspdFeature[]> {
    const params = {
      query,
      thematicSearchId: themeId,
    };

    const response = await this.client.get<NSPDSearchResponse>(
      '/geoportal/v2/search/geoportal',
      params,
    );

    return this.extractFeatures(response);
  }

  /**
   * Поиск в конкретном слое по query.
   */
  async searchInLayer(
    query: string,
    layerId: number,
  ): Promise<NspdFeature[]> {
    const params = {
      query,
      layersId: layerId,
    };

    const response = await this.client.get<NSPDSearchResponse>(
      '/geoportal/v2/search/geoportal',
      params,
    );

    return this.extractFeatures(response);
  }

  /**
   * Поиск по query в нескольких слоях одновременно.
   */
  async searchInLayers(
    query: string,
    layerIds: number[],
  ): Promise<NspdFeature[]> {
    const params = {
      query,
      layersId: layerIds.join(','),
    };

    const response = await this.client.get<NSPDSearchResponse>(
      '/geoportal/v2/search/geoportal',
      params,
    );

    return this.extractFeatures(response);
  }

  /**
   * Поиск одного объекта по query.
   * Если найдено >1 объект — выбрасывает AmbiguousSearchError.
   */
  async find(
    query: string,
    themeId: ThemeId = ThemeId.REAL_ESTATE_OBJECTS,
  ): Promise<NspdFeature> {
    const results = await this.search(query, themeId);

    if (results.length === 0) {
      return null as unknown as NspdFeature;
    }

    if (results.length > 1) {
      throw new AmbiguousSearchError(query, results.length);
    }

    return results[0];
  }

  /**
   * Поиск одного объекта в конкретном слое.
   */
  async findInLayer(
    query: string,
    layerId: number,
  ): Promise<NspdFeature> {
    const results = await this.searchInLayer(query, layerId);

    if (results.length === 0) {
      return null as unknown as NspdFeature;
    }

    if (results.length > 1) {
      throw new AmbiguousSearchError(query, results.length);
    }

    return results[0];
  }

  // ==================== Point Search (WMS GetFeatureInfo) ====================

  /**
   * Поиск объектов по координатам (lat, lng) через WMS GetFeatureInfo.
   */
  async searchAtPoint(
    lat: number,
    lng: number,
    layerId: number,
    layerName: string,
  ): Promise<NspdFeature[]> {
    const bbox = createBoundingBoxFromPoint(lat, lng);
    const pixelCoords = latLonToWmsPixel(lat, lng, 512, 512, bbox);

    const params = {
      ...WMS_GETFEATUREINFO_PARAMS,
      QUERY_LAYERS: String(layerId),
      LAYERS: String(layerId),
      I: pixelCoords.i,
      J: pixelCoords.j,
      X: pixelCoords.x,
      Y: pixelCoords.y,
      BBOX: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    };

    const response = await this.client.get<any>(
      `/aeggis/v3/${layerId}/wms`,
      params,
    );

    return this.parseWMSResponse(response, layerId, layerName);
  }

  /**
   * Поиск объектов по координатам (удобая обёртка над searchAtPoint).
   */
  async searchAtCoords(
    lat: number,
    lng: number,
    layerId: number,
    layerName: string,
  ): Promise<NspdFeature[]> {
    return this.searchAtPoint(lat, lng, layerId, layerName);
  }

  // ==================== Contour Search (Polygon) ====================

  /**
   * Поиск объектов в пределах полигона.
   * geometry — GeoJSON Polygon/MultiPolygon coordinates.
   * layerNodes — массив LayerNode для определения категорий.
   */
  async searchInContour(
    geometry: { type: string; coordinates: number[][][][] },
    layerNodes: LayerNode[],
    onlyIntersects: boolean = false,
  ): Promise<NspdFeature[]> {
    const area = estimateAreaSqDeg(geometry.coordinates);

    if (area > MAX_CONTOUR_AREA_SQ_DEG) {
      throw new TooBigContourError(area);
    }

    const categories = toIntersectCategories(layerNodes, geometry);

    const body: NSPDIntersectRequest = {
      typeIntersect: 'fullObject',
      categories,
    };

    const response = await this.client.post<NSPDSearchResponse>(
      '/geoportal/v1/intersects',
      body,
    );

    return this.extractFeatures(response);
  }

  /**
   * Итеративный поиск объектов в большом контуре.
   * Разбивает большую область на тайлы и выполняет поиск по каждому.
   * Возвращает массив результатов (не Generator, т.к. TS не поддерживает async generators в декораторах).
   */
  async searchInContourIter(
    geometry: { type: string; coordinates: number[][][][] },
    layerNodes: LayerNode[],
    onlyIntersects: boolean = false,
  ): Promise<NspdFeature[]> {
    const area = estimateAreaSqDeg(geometry.coordinates);

    if (area <= MAX_CONTOUR_AREA_SQ_DEG) {
      return this.searchInContour(geometry, layerNodes, onlyIntersects);
    }

    const tiles = tilePolygon(geometry.coordinates);
    const allFeatures: NspdFeature[] = [];
    const seenIds = new Set<string>();

    for (const tile of tiles) {
      try {
        // Создаём тайл-полигон
        const tileGeometry = {
          type: 'Polygon',
          coordinates: [
            [
              [tile.minLng, tile.minLat],
              [tile.maxLng, tile.minLat],
              [tile.maxLng, tile.maxLat],
              [tile.minLng, tile.maxLat],
              [tile.minLng, tile.minLat],
            ],
          ],
        } as unknown as { type: string; coordinates: number[][][][] };

        const features = await this.searchInContour(
          tileGeometry,
          layerNodes,
          onlyIntersects,
        );

        for (const feature of features) {
          // Уникализация по cad_num (если есть)
          const cadNum =
            (feature.properties as any).cad_num ??
            feature.properties?.cad_num;
          const id = cadNum ?? JSON.stringify(feature.geometry);

          if (!seenIds.has(id)) {
            seenIds.add(id);
            allFeatures.push(feature);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Tile search failed: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return allFeatures;
  }

  // ==================== Helpers ====================

  /**
   * Извлечь NspdFeature из NSPDSearchResponse.
   */
  private extractFeatures(response: NSPDSearchResponse): NspdFeature[] {
    if (!response?.data?.features) {
      return [];
    }

    return response.data.features
      .map((feature) => {
        const layerMeta = this.resolveLayerMeta(
          (feature.properties as any)?.category as number,
        );

        return {
          type: 'Feature',
          geometry: feature.geometry as GeoJSONGeometry,
          properties: feature.properties as NspdFeature['properties'],
          layerMeta,
        } as NspdFeature | null;
      })
      .filter((f): f is NspdFeature => f !== null);
  }

  /**
   * Парсить WMS GetFeatureInfo ответ.
   */
  private parseWMSResponse(
    response: any,
    layerId: number,
    layerName: string,
  ): NspdFeature[] {
    if (!response) return [];

    // WMS может вернуть массив объектов или FeatureCollection
    let features: any[] = [];

    if (Array.isArray(response)) {
      features = response;
    } else if (response?.features) {
      features = response.features;
    } else if (response?.features?.length) {
      features = response.features;
    }

    return features.map((feat) => ({
      type: 'Feature',
      geometry: (feat.geometry ?? {
        type: 'Point',
        coordinates: [0, 0],
      }) as GeoJSONGeometry,
      properties: {
        category: layerId,
        categoryName: layerName,
        ...feat.properties,
      } as NspdFeature['properties'],
      layerMeta: this.resolveLayerMeta(layerId),
    })) as NspdFeature[];
  }

  /**
   * Разрешить LayerNode по categoryId из кэша или по умолчанию.
   */
  private resolveLayerMeta(categoryId: number): LayerNode | undefined {
    // TODO: В будущем — lookup из кэша слоёв NSPDService
    // Пока возвращаем undefined, т.к. точная информация о слое
    // доступна через NSPDService.getLayers()
    return undefined;
  }
}
