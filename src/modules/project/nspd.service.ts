import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

/**
 * Layer info from NSPD GetLegendGraphic
 */
export interface NSPDLegend {
  layerId: number;
  name: string;
  description: string;
  style?: string;
  [key: string]: unknown;
}

/**
 * NSPD layer configuration
 */
export interface NSPDLayerConfig {
  id: number;
  name: string;
  enabled: boolean;
  description?: string;
}

const NSPD_DEFAULT_LAYERS: NSPDLayerConfig[] = [
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
  {
    id: 855413,
    name: 'Кадастровые районы',
    enabled: true,
    description: 'Границы кадастровых районов',
  },
  {
    id: 875845,
    name: 'Зоны с особыми условиями',
    enabled: true,
    description: 'Охранные зоны и ЗКУТ',
  },
];

/**
 * HTTPS agent that accepts self-signed certificates
 * Required for NSPD (nspd.gov.ru) which uses internal SSL certs
 */
function createNspdHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false,
  });
}

@Injectable()
export class NSPDService {
  private readonly logger = new Logger(NSPDService.name);
  private readonly NSPD_BASE_URL: string;
  private readonly CACHE_TTL_MS: number;
  private readonly httpsAgent: https.Agent;

  private layerCache: Map<string, { data: NSPDLayerConfig[]; timestamp: number }> | null = null;
  private legendCache: Map<string, { data: NSPDLegend; timestamp: number }> | null = null;
  private mapCache: Map<string, { data: Buffer; timestamp: number }> | null = null;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.NSPD_BASE_URL =
      configService.get<string>('NSPD_BASE_URL') ||
      'https://nspd.gov.ru/api/aeggis/v4';
    this.CACHE_TTL_MS =
      Number(configService.get<number>('NSPD_CACHE_TTL_MS')) || 3600000; // 1 hour

    this.httpsAgent = createNspdHttpsAgent();
  }

  // ==================== Layers ====================

  /**
   * Получить список всех доступных слоев НСПД
   */
  async getLayers(): Promise<NSPDLayerConfig[]> {
    const cached = this.getCached<NSPDLayerConfig[]>(this.layerCache, 'layers');
    if (cached) return cached;

    try {
      const layers: NSPDLayerConfig[] = [];

      for (const layerConfig of NSPD_DEFAULT_LAYERS) {
        const legend = await this.getLayerLegend(layerConfig.id);
        if (legend) {
          layers.push({
            id: layerConfig.id,
            name: (legend.name as string) || layerConfig.name,
            enabled: true,
            description: (legend.description as string) || layerConfig.description,
          });
        }
      }

      this.setCached(this.layerCache, 'layers', layers);
      return layers;
    } catch (error) {
      this.logger.error('Failed to fetch NSPD layers', error);
      // Return fallback layers
      return NSPD_DEFAULT_LAYERS;
    }
  }

  /**
   * Получить информацию о конкретном слое
   */
  async getLayerInfo(layerId: number): Promise<NSPDLayerConfig | null> {
    const layers = await this.getLayers();
    return layers.find((layer) => layer.id === layerId) || null;
  }

  /**
   * Получить легенду (metadata) слоя
   */
  async getLayerLegend(layerId: number): Promise<NSPDLegend | null> {
    const cacheKey = `legend_${layerId}`;
    const cached = this.getCached<NSPDLegend>(this.legendCache, cacheKey);
    if (cached) return cached;

    try {
      const url = this.buildWMSUrl(layerId, {
        REQUEST: 'GetLegendGraphic',
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        FORMAT: 'application/json',
        LAYER: String(layerId),
        LAYERS: String(layerId),
        SLD_VERSION: '1.1.0',
      });

      const response = await this.fetchWithAgent(url, 10000);

      if (!response.ok) {
        return null;
      }

      const legend = await response.json();
      this.setCached(this.legendCache, cacheKey, legend);
      return legend;
    } catch (error) {
      this.logger.debug(`Failed to fetch legend for layer ${layerId}`, error);
      return null;
    }
  }

  // ==================== Map Images ====================

  /**
   * Получить URL изображения карты НСПД
   * @param layerId - ID слоя
   * @param bbox - Границы [minX, minY, maxX, maxY] в EPSG:3857
   * @param width - Ширина
   * @param height - Высота
   */
  getMapImageUrl(
    layerId: number,
    bbox: [number, number, number, number],
    width = 512,
    height = 512,
  ): string {
    return this.buildWMSUrl(layerId, {
      REQUEST: 'GetMap',
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      FORMAT: 'image/png',
      STYLES: '',
      TRANSPARENT: 'true',
      LAYERS: String(layerId),
      RANDOM: String(Math.random()),
      WIDTH: String(width),
      HEIGHT: String(height),
      CRS: 'EPSG:3857',
      BBOX: `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`,
    });
  }

  /**
   * Получить изображение карты НСПД (Buffer)
   */
  async getMapImage(
    layerId: number,
    bbox: [number, number, number, number],
    width = 512,
    height = 512,
  ): Promise<Buffer> {
    const cacheKey = `map_${layerId}_${bbox.join(',')}_${width}x${height}`;
    const cached = this.getCached<Buffer>(this.mapCache, cacheKey);
    if (cached) return cached;

    try {
      const url = this.getMapImageUrl(layerId, bbox, width, height);
      const response = await this.fetchWithAgent(url, 15000);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      this.setCached(this.mapCache, cacheKey, imageBuffer);
      return imageBuffer;
    } catch (error) {
      this.logger.error('Failed to fetch NSPD map image', error);
      throw new BadRequestException('Не удалось получить изображение карты НСПД');
    }
  }

  // ==================== Coordinate Conversion ====================

  /**
   * Convert lat/lon (EPSG:4326) to Web Mercator (EPSG:3857)
   */
  latLonToWebMercator(
    lat: number,
    lon: number,
  ): [number, number] {
    const x = lon * 20037508.34 / 180;
    const y = Math.log(
      Math.tan((90 + lat) * Math.PI / 360),
    ) * 20037508.34 / 180;
    return [x, y];
  }

  /**
   * Convert Web Mercator (EPSG:3857) to lat/lon (EPSG:4326)
   */
  webMercatorToLatLon(
    x: number,
    y: number,
  ): [number, number] {
    const lon = x / 20037508.34 * 180;
    const lat = (
      Math.atan(Math.sinh(y / 20037508.34 * Math.PI)) * 180 / Math.PI
    ) - 90;
    return [lat, lon];
  }

  /**
   * Create bbox in Web Mercator from lat/lon bounds
   */
  createMercatorBbox(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
  ): [number, number, number, number] {
    const [minX, minY] = this.latLonToWebMercator(minLat, minLon);
    const [maxX, maxY] = this.latLonToWebMercator(maxLat, maxLon);
    return [minX, minY, maxX, maxY];
  }

  // ==================== Private Helpers ====================

  /**
   * Build WMS request URL with correct parameter order
   */
  private buildWMSUrl(
    layerId: number,
    params: Record<string, string>,
  ): string {
    const url = `${this.NSPD_BASE_URL}/${layerId}/wms`;
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Fetch with HTTPS agent that accepts self-signed certs
   */
  private async fetchWithAgent(
    url: string,
    timeoutMs: number,
  ): Promise<Response> {
    // Use node-fetch or native fetch with agent
    // For Node.js 18+, we need to use undici or node-fetch
    // Since we can't rely on undici, we'll use a workaround

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Try native fetch first (Node.js 18+ with --experimental-fetch)
      // If that fails due to SSL, fall back to https.request
      return await this.fetchWithHttpsAgent(url, controller);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetch using Node.js https module (works with self-signed certs)
   */
  private fetchWithHttpsAgent(
    url: string,
    controller: AbortController,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        agent: this.httpsAgent,
        signal: controller.signal,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);

          // Build headers object
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            headers[key] = Array.isArray(value) ? value.join(', ') : (value || '');
          }

          resolve({
            ok: res.statusCode! >= 200 && res.statusCode! < 300,
            status: res.statusCode!,
            statusText: res.statusMessage || '',
            redirected: false,
            type: 'basic' as ResponseType,
            url: url,
            arrayBuffer: async () => buffer,
            json: async () => JSON.parse(buffer.toString()),
            text: async () => buffer.toString(),
            headers: new Headers(headers),
          } as unknown as Response);
        });
      });

      req.on('error', reject);
      req.on('abort', () => {
        reject(new Error('Request aborted'));
      });

      req.end();
    });
  }

  /**
   * Get cached data if not expired
   */
  private getCached<T>(
    cache: Map<string, { data: T; timestamp: number }> | null,
    key: string,
  ): T | null {
    if (!cache) return null;

    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCached<T>(
    cache: Map<string, { data: T; timestamp: number }> | null,
    key: string,
    data: T,
  ) {
    if (!cache) return;

    cache.set(key, { data, timestamp: Date.now() });

    // Clean old entries if cache is too large
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL_MS) {
          cache.delete(k);
        }
      }
    }
  }

  // ==================== Cache Management ====================

  getLayerCacheSize(): number {
    return this.layerCache?.size || 0;
  }

  getLegendCacheSize(): number {
    return this.legendCache?.size || 0;
  }

  getMapCacheSize(): number {
    return this.mapCache?.size || 0;
  }

  getCacheTTL(): number {
    return this.CACHE_TTL_MS;
  }

  clearCache(): void {
    this.layerCache?.clear();
    this.legendCache?.clear();
    this.mapCache?.clear();
    this.logger.log('NSPD cache cleared');
  }
}
