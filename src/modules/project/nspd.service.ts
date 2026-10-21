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
  layerMeta?: {
    title: string;
    layerTreeId: number;
    layerId: number;
    layerType: 'wms';
    geometryType: 'Polygon' | 'LineString' | 'Point' | 'GeometryCollection';
    layerName: string;
    layerVisibleByDefault: boolean;
    categoryId: number;
  };
}

const NSPD_DEFAULT_LAYERS: NSPDLayerConfig[] = [
  {
    id: 36048,
    name: 'Земельные участки из ЕГРН',
    enabled: true,
    description: 'Границы земельных участков из ЕГРН',
  },
  {
    id: 36049,
    name: 'Здания',
    enabled: true,
    description: 'Здания и объекты незавершенного строительства из ЕГРН',
  },
  {
    id: 36328,
    name: 'Сооружения',
    enabled: true,
    description: 'Сооружения из ЕГРН',
  },
  {
    id: 36329,
    name: 'Объекты незавершенного строительства',
    enabled: true,
    description: 'Объекты незавершённого строительства',
  },
  {
    id: 36070,
    name: 'Кадастровые районы',
    enabled: true,
    description: 'Границы кадастровых районов',
  },
  {
    id: 36071,
    name: 'Кадастровые округа',
    enabled: true,
    description: 'Границы кадастровых округов',
  },
  {
    id: 855413,
    name: 'Кадастровые кварталы',
    enabled: true,
    description: 'Границы кадастровых кварталов',
  },
  {
    id: 875845,
    name: 'Зоны с особыми условиями',
    enabled: true,
    description: 'Охранные зоны, ЗОУИТ',
  },
  {
    id: 879243,
    name: 'Красные линии',
    enabled: true,
    description: 'Границы красных линий',
  },
  {
    id: 37236,
    name: 'Кадастровая стоимость объекта',
    enabled: true,
    description: 'Кадастровая стоимость объекта — тепловая карта',
  },
  {
    id: 37758,
    name: 'Удельный показатель кадастровой стоимости',
    enabled: true,
    description: 'Удельный показатель кадастровой стоимости — тепловая карта',
  },
  {
    id: 36473,
    name: 'Земельные участки по проекту межевания',
    enabled: true,
    description:
      'Земельные участки, образуемые по проекту межевания территории',
  },
  {
    id: 36945,
    name: 'Кадастровые округа (ПКК)',
    enabled: true,
    description: 'Границы кадастровых округов из ПКК',
  },
  {
    id: 37294,
    name: 'Земельные участки по СРЗУ',
    enabled: true,
    description:
      'Земельные участки, образуемые по схеме расположения земельного участка',
  },
  {
    id: 37295,
    name: 'Территория ликвидации накопленного вреда (Усолье-Сибирское)',
    enabled: true,
    description:
      'Территория проведения мероприятий по ликвидации накопленного вреда окружающей среде',
  },
  {
    id: 37298,
    name: 'Земельные участки свободные от прав третьих лиц',
    enabled: true,
    description: 'Земельные участки, свободные от прав третьих лиц',
  },
  {
    id: 37299,
    name: 'Земельные участки, выставленные на аукцион',
    enabled: true,
    description: 'Земельные участки, выставленные на аукцион',
  },
  {
    id: 37313,
    name: 'Государственная граница Российской Федерации',
    enabled: true,
    description: 'Государственная граница Российской Федерации',
  },
  {
    id: 37430,
    name: 'Территории выполнения ККР',
    enabled: true,
    description: 'Территории выполнения комплексных кадастровых работ',
  },
  {
    id: 37433,
    name: 'Единые недвижимые комплексы',
    enabled: true,
    description: 'Единые недвижимые комплексы',
  },
  {
    id: 37434,
    name: 'Предприятие как имущественный комплекс',
    enabled: true,
    description: 'Предприятие как имущественный комплекс',
  },
  {
    id: 37577,
    name: 'ЗОУИТ объектов культурного наследия',
    enabled: true,
    description: 'ЗОУИТ объектов культурного наследия',
  },
  {
    id: 37578,
    name: 'ЗОУИТ объектов энергетики, связи, транспорта',
    enabled: true,
    description: 'ЗОУИТ объектов энергетики, связи, транспорта',
  },
  {
    id: 37580,
    name: 'ЗОУИТ природных территорий',
    enabled: true,
    description: 'ЗОУИТ природных территорий',
  },
  {
    id: 37579,
    name: 'ЗОУИТ охраняемых объектов и безопасности',
    enabled: true,
    description: 'ЗОУИТ охраняемых объектов и безопасности',
  },
  {
    id: 37581,
    name: 'Иные ЗОУИТ',
    enabled: true,
    description: 'Иные ЗОУИТ',
  },
  {
    id: 872153,
    name: 'Водная эрозия',
    enabled: true,
    description: 'Водная эрозия',
  },
  {
    id: 872155,
    name: 'Линейная эрозия',
    enabled: true,
    description: 'Линейная эрозия',
  },
  {
    id: 872164,
    name: 'Ветровая эрозия',
    enabled: true,
    description: 'Ветровая эрозия',
  },
  {
    id: 872182,
    name: 'Опустынивание',
    enabled: true,
    description: 'Опустынивание',
  },
  {
    id: 872183,
    name: 'Переувлажнение',
    enabled: true,
    description: 'Переувлажнение',
  },
  {
    id: 872202,
    name: 'Подтопление',
    enabled: true,
    description: 'Подтопление',
  },
  {
    id: 872203,
    name: 'Заболачивание',
    enabled: true,
    description: 'Заболачивание',
  },
  {
    id: 872205,
    name: 'Затопление',
    enabled: true,
    description: 'Затопление',
  },
  {
    id: 872206,
    name: 'Захламление',
    enabled: true,
    description: 'Захламление',
  },
  {
    id: 872210,
    name: 'Обвально-осыпные и оползневые процессы',
    enabled: true,
    description: 'Обвально-осыпные и оползневые процессы',
  },
  {
    id: 872211,
    name: 'Абразия',
    enabled: true,
    description: 'Абразия',
  },
  {
    id: 872212,
    name: 'Иные нарушенные земли',
    enabled: true,
    description: 'Иные нарушенные земли',
  },
  {
    id: 872213,
    name: 'Нарушенные земли при наземном строительстве',
    enabled: true,
    description: 'Нарушенные земли при наземном строительстве',
  },
  {
    id: 872216,
    name: 'Нарушенные земли при гидротехническом строительстве',
    enabled: true,
    description: 'Нарушенные земли при гидротехническом строительстве',
  },
  {
    id: 872217,
    name: 'Нарушенные земли при недропользовании',
    enabled: true,
    description: 'Нарушенные земли при недропользовании',
  },
  {
    id: 872218,
    name: 'Нарушенные земли при промышленном лесопользовании',
    enabled: true,
    description: 'Нарушенные земли при промышленном лесопользовании',
  },
  {
    id: 872219,
    name: 'Нарушенные земли при сельскохозяйственном освоении',
    enabled: true,
    description: 'Нарушенные земли при сельскохозяйственном освоении',
  },
  {
    id: 872220,
    name: 'Нарушенные земли при проведении геологоразведочных работ',
    enabled: true,
    description:
      'Нарушенные земли при проведении геологоразведочных, испытательных, эксплуатационных и иных работ',
  },
  {
    id: 872221,
    name: 'Нарушенные земли при складировании и захоронении отходов',
    enabled: true,
    description:
      'Нарушенные земли при складировании и захоронении промышленных отходов, загрязнение земель',
  },
  {
    id: 872222,
    name: 'Гари',
    enabled: true,
    description: 'Гари',
  },
  {
    id: 872224,
    name: 'Негативный процесс отсутствует',
    enabled: true,
    description: 'Негативный процесс отсутствует',
  },
  {
    id: 872262,
    name: 'Засоление',
    enabled: true,
    description: 'Засоление',
  },
  {
    id: 875815,
    name: 'Субъекты Российской Федерации (линии)',
    enabled: true,
    description: 'Субъекты Российской Федерации (линии)',
  },
  {
    id: 875817,
    name: 'Субъекты Российской Федерации (полигоны)',
    enabled: true,
    description: 'Субъекты Российской Федерации (полигоны)',
  },
  {
    id: 875819,
    name: 'Муниципальные образования (полигональный)',
    enabled: true,
    description: 'Муниципальные образования (полигональный)',
  },
  {
    id: 875824,
    name: 'Муниципальные образования (линейный)',
    enabled: true,
    description: 'Муниципальные образования (линейный)',
  },
  {
    id: 875831,
    name: 'Населённые пункты (полигоны)',
    enabled: true,
    description: 'Населённые пункты (полигоны)',
  },
  {
    id: 875832,
    name: 'Береговые линии (полигональный)',
    enabled: true,
    description: 'Береговые линии (границы водных объектов) (полигональный)',
  },
  {
    id: 875835,
    name: 'Береговые линии (линейный)',
    enabled: true,
    description: 'Береговые линии (границы водных объектов) (линейный)',
  },
  {
    id: 875838,
    name: 'Территориальные зоны',
    enabled: true,
    description: 'Территориальные зоны',
  },
  {
    id: 875840,
    name: 'Территории объектов культурного наследия',
    enabled: true,
    description: 'Территории объектов культурного наследия',
  },
  {
    id: 875846,
    name: 'Особые экономические зоны',
    enabled: true,
    description: 'Особые экономические зоны',
  },
  {
    id: 875847,
    name: 'Охотничьи угодья',
    enabled: true,
    description: 'Охотничьи угодья',
  },
  {
    id: 875848,
    name: 'Территории опережающего развития',
    enabled: true,
    description: 'Территории опережающего развития',
  },
  {
    id: 875865,
    name: 'Игорные зоны',
    enabled: true,
    description: 'Игорные зоны',
  },
  {
    id: 875866,
    name: 'Лесничества',
    enabled: true,
    description: 'Лесничества',
  },
  {
    id: 875874,
    name: 'Граница лесопарка',
    enabled: true,
    description: 'Граница лесопарка',
  },
  {
    id: 875882,
    name: 'Населённые пункты (линии)',
    enabled: true,
    description: 'Населённые пункты (линии)',
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

  private layerCache: Map<
    string,
    { data: NSPDLayerConfig[]; timestamp: number }
  > | null = null;
  private legendCache: Map<
    string,
    { data: NSPDLegend; timestamp: number }
  > | null = null;
  private mapCache: Map<string, { data: Buffer; timestamp: number }> | null =
    null;

  constructor(private readonly configService: ConfigService) {
    this.NSPD_BASE_URL =
      configService.get<string>('NSPD_BASE_URL') ||
      'https://nspd.gov.ru/api/aeggis/v3';
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

    const layers: NSPDLayerConfig[] = NSPD_DEFAULT_LAYERS.map((l) => ({
      id: l.id,
      name: l.name,
      enabled: true,
      description: l.description,
      layerMeta: {
        title: l.name,
        layerTreeId: l.id,
        layerId: l.id,
        layerType: 'wms',
        geometryType: 'Polygon',
        layerName: String(l.id),
        layerVisibleByDefault: true,
        categoryId: l.id,
      },
    }));

    this.setCached(this.layerCache, 'layers', layers);
    return layers;
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
      SRS: 'EPSG:3857',
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

    const url = this.getMapImageUrl(layerId, bbox, width, height);
    this.logger.debug(`Fetching map image from: ${url}`);

    try {
      const response = await this.fetchWithAgent(url, 15000);

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `NSPD map image request failed: HTTP ${response.status}, body: ${text.substring(0, 500)}`,
        );
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      this.setCached(this.mapCache, cacheKey, imageBuffer);
      return imageBuffer;
    } catch (error) {
      this.logger.error('Failed to fetch NSPD map image', error);
      throw new BadRequestException(
        `Не удалось получить изображение карты: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ==================== Coordinate Conversion ====================

  /**
   * Convert lat/lon (EPSG:4326) to Web Mercator (EPSG:3857)
   */
  latLonToWebMercator(lat: number, lon: number): [number, number] {
    const x = (lon * 20037508.34) / 180;
    const y =
      (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 20037508.34) / 180;
    return [x, y];
  }

  /**
   * Convert Web Mercator (EPSG:3857) to lat/lon (EPSG:4326)
   */
  webMercatorToLatLon(x: number, y: number): [number, number] {
    const lon = (x / 20037508.34) * 180;
    const lat =
      (Math.atan(Math.sinh((y / 20037508.34) * Math.PI)) * 180) / Math.PI - 90;
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
  private buildWMSUrl(layerId: number, params: Record<string, string>): string {
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

      const browsers = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      ];

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        agent: this.httpsAgent,
        signal: controller.signal,
        headers: {
          'User-Agent': browsers[Math.floor(Math.random() * browsers.length)],
          Referer: 'https://nspd.gov.ru/map?thematic=PKK',
          Host: parsedUrl.hostname,
        },
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
            headers[key] = Array.isArray(value)
              ? value.join(', ')
              : value || '';
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
