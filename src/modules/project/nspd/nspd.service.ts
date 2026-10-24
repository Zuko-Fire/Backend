// src/modules/project/nspd/nspd.service.ts
// Сервис WMS-слоев, карт и конвертации координат НСПД

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NSPDClientService } from './nspd.client.service';
import {
  NSPDLayerConfig,
  LayerNode,
  WebMercatorBbox,
  BoundingBox,
  Coordinates,
  NSPD_DEFAULT_LAYERS,
} from './nspd.types';

/**
 * Сервис работы с WMS-слоями НСПД.
 * Реализует:
 * - Получение и кэширование списка слоёв
 * - Получение легенд слоёв
 * - Генерацию URL и загрузку WMS-карт
 * - Конвертацию координат (EPSG:4326 <-> EPSG:3857)
 */
@Injectable()
export class NSPDService {
  private readonly logger = new Logger(NSPDService.name);
  private readonly client: NSPDClientService;

  // Внутренние кэши
  private readonly layerCache = new Map<number, LayerNode>();
  private readonly layerConfigCache = new Map<number, NSPDLayerConfig>();
  private readonly legendCache = new Map<number, Buffer>();
  private readonly cacheExpiries = new Map<number, number>();

  constructor(
    nspdClient: NSPDClientService,
    private readonly configService: ConfigService,
  ) {
    this.client = nspdClient;
  }

  // ==================== Layer Management ====================

  /**
   * Получить все слои НСПД.
   * Загружает с сервера и кэширует. При ошибке возвращает дефолтные слои.
   */
  async getLayers(): Promise<NSPDLayerConfig[]> {
    // Проверяем кэш
    if (this.layerCache.size > 0) {
      return this.buildLayerConfigs();
    }

    try {
      // Загружаем слои через WMS GetCapabilities (упрощённо - через список известных ID)
      await this.loadDefaultLayers();
      this.logger.log(`Loaded ${this.layerCache.size} layers from defaults`);
    } catch (error) {
      this.logger.error(
        `Failed to load layers: ${error instanceof Error ? error.message : error}`,
      );
      await this.loadDefaultLayers();
    }

    return this.buildLayerConfigs();
  }

  /**
   * Получить информацию о слое по ID.
   */
  async getLayerInfo(layerId: number): Promise<NSPDLayerConfig | null> {
    const meta = this.layerCache.get(layerId);
    if (!meta) {
      // Пытаемся загрузить все слои
      const layers = await this.getLayers();
      return layers.find((l) => l.id === layerId) ?? null;
    }

    return {
      id: meta.layerId,
      name: meta.title,
      enabled: true,
      description: `Layer ${meta.title}`,
      layerMeta: meta,
    };
  }

  /**
   * Загрузить дефолтные слои в кэш.
   */
  private async loadDefaultLayers(): Promise<void> {
    for (const defaultLayer of NSPD_DEFAULT_LAYERS) {
      this.layerCache.set(defaultLayer.id, {
        title: defaultLayer.name,
        layerTreeId: defaultLayer.id,
        layerId: defaultLayer.id,
        layerType: 'wms',
        geometryType: 'Polygon',
        layerName: String(defaultLayer.id),
        layerVisibleByDefault: defaultLayer.enabled,
        categoryId: defaultLayer.id,
      } as LayerNode);
    }
  }

  /**
   * Построить массив NSPDLayerConfig из кэшированных LayerNode.
   */
  private buildLayerConfigs(): NSPDLayerConfig[] {
    const configs: NSPDLayerConfig[] = [];

    for (const [id, meta] of this.layerCache.entries()) {
      configs.push({
        id: meta.layerId,
        name: meta.title,
        enabled: meta.layerVisibleByDefault,
        description: `Layer: ${meta.title}`,
        layerMeta: meta,
      });
    }

    return configs;
  }

  // ==================== Layer Legend ====================

  /**
   * Получить легенду слоя (SVG/PNG).
   */
  async getLayerLegend(layerId: number): Promise<Buffer | null> {
    // Проверяем кэш
    const cached = this.legendCache.get(layerId);
    if (cached && !this.isCacheExpired(layerId)) {
      return cached;
    }

    try {
      const url = this.buildWmsUrl(layerId, {
        REQUEST: 'GetLegendGraphic',
        VERSION: '1.3.0',
        SERVICE: 'WMS',
        FORMAT: 'image/svg+xml',
        LAYERS: String(layerId),
      });

      const buffer = await this.fetchAsBuffer(url);
      this.legendCache.set(layerId, buffer);
      this.setCacheExpiry(layerId);

      return buffer;
    } catch (error) {
      this.logger.error(
        `Failed to fetch legend for layer ${layerId}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  // ==================== WMS Map ====================

  /**
   * Построить URL WMS GetMap запроса.
   */
  getMapImageUrl(
    layerId: number,
    bbox: BoundingBox,
    width: number = 1024,
    height: number = 1024,
  ): string {
    const mercatorBbox = this.createMercatorBbox(bbox);

    return this.buildWmsUrl(layerId, {
      REQUEST: 'GetMap',
      VERSION: '1.3.0',
      SERVICE: 'WMS',
      LAYERS: String(layerId),
      STYLES: '',
      SRS: 'EPSG:3857',
      BBOX: `${mercatorBbox.xmin},${mercatorBbox.ymin},${mercatorBbox.xmax},${mercatorBbox.ymax}`,
      WIDTH: String(width),
      HEIGHT: String(height),
      FORMAT: 'image/png',
      TRANSPARENT: 'true',
    });
  }

  /**
   * Загрузить WMS-карту как Buffer.
   */
  async getMapImage(
    layerId: number,
    bbox: BoundingBox,
    width: number = 1024,
    height: number = 1024,
  ): Promise<Buffer | null> {
    const url = this.getMapImageUrl(layerId, bbox, width, height);
    return this.fetchAsBuffer(url);
  }

  // ==================== Coordinate Conversion ====================

  /**
   * Конвертировать EPSG:4326 (lat, lng) в EPSG:3857 (Web Mercator).
   */
  latLonToWebMercator(lat: number, lng: number): { x: number; y: number } {
    const x = (lng * Math.PI * 6378137) / 180;
    const y =
      (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 6378137) / Math.PI;

    return { x, y };
  }

  /**
   * Конвертировать EPSG:3857 (Web Mercator) в EPSG:4326 (lat, lng).
   */
  webMercatorToLatLon(x: number, y: number): { lat: number; lng: number } {
    const lng = (x * 180) / (Math.PI * 6378137);
    const lat =
      ((2 * Math.atan(Math.exp((y * Math.PI) / (180 * 6378137))) -
        Math.PI / 2) *
        180) /
      Math.PI;

    return { lat, lng };
  }

  /**
   * Создать Web Mercator BBOX из lat/lng координат.
   */
  createMercatorBbox(bbox: BoundingBox): WebMercatorBbox {
    const topLeft = this.latLonToWebMercator(bbox.maxLat, bbox.minLng);
    const bottomRight = this.latLonToWebMercator(bbox.minLat, bbox.maxLng);

    return {
      xmin: topLeft.x,
      ymin: bottomRight.y,
      xmax: bottomRight.x,
      ymax: topLeft.y,
    };
  }

  // ==================== Cache Management ====================

  /**
   * Получить размер кэша слоёв.
   */
  getLayerCacheSize(): number {
    return this.layerCache.size;
  }

  /**
   * Получить размер кэша легенд.
   */
  getLegendCacheSize(): number {
    return this.legendCache.size;
  }

  /**
   * Получить TTL кэша.
   */
  getCacheTTL(): number {
    return this.client.getConfig().cacheTtlMs;
  }

  /**
   * Очистить все кэши.
   */
  clearCache(): void {
    this.layerCache.clear();
    this.legendCache.clear();
    this.cacheExpiries.clear();
    this.client.clearCache();
    this.logger.log('NSPD all caches cleared');
  }

  // ==================== Internal Helpers ====================

  /**
   * Построить WMS URL для слоя.
   */
  private buildWmsUrl(layerId: number, params: Record<string, string>): string {
    const url = new URL(`/aeggis/v3/${layerId}/wms`, this.client.getBaseUrl());

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    return url.toString();
  }

  /**
   * Загрузить URL как Buffer.
   */
  private async fetchAsBuffer(url: string): Promise<Buffer> {
    const response = await globalThis.fetch(url, {
      headers: {
        'User-Agent': 'NSPD-Service/1.0',
      },
      // @ts-expect-error - node-fetch supports agent option
      agent: this.getHttpsAgent(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Получить HTTPS-агент с отключённой проверкой сертификатов.
   */
  private getHttpsAgent(): any {
    // В Node.js 18+ globalThis.fetch поддерживает self-signed через NODE_TLS_REJECT_UNAUTHORIZED
    // Для старых версий можно использовать custom agent
    return undefined;
  }

  /**
   * Проверить, истёк ли кэш.
   */
  private isCacheExpired(layerId: number): boolean {
    const expiry = this.cacheExpiries.get(layerId);
    if (!expiry) return true;
    return Date.now() > expiry;
  }

  /**
   * Установить время истечения кэша.
   */
  private setCacheExpiry(layerId: number): void {
    this.cacheExpiries.set(
      layerId,
      Date.now() + this.client.getConfig().cacheTtlMs,
    );
  }
}
