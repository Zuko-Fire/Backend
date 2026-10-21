// src/modules/project/nspd/nspd.client.service.ts
// Базовый HTTP-клиент для работы с НСПД (вдохновлено pynspd)

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { NSPDClientConfig, NSPD_DEFAULT_LAYERS } from './nspd.types';
import {
  PynspdServerError,
  BlockedIPError,
  TooManyRequestsError,
  NotFoundError,
  PynspdNetworkError,
  UnknownResponseError,
} from './nspd.errors';

/**
 * Генерация случайного User-Agent для обхода блокировки
 */
function generateUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0',
  ];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

/**
 * Создание HTTPS-агента с отключённой проверкой сертификатов
 * (НСПД использует внутренние/self-signed сертификаты Минцифры)
 */
function createHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false,
  });
}

/**
 * Задержка перед retry (экспоненциальная с джиттером)
 */
function sleepWithJitter(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
): Promise<void> {
  const exponentialDelay = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * 0.5 + 0.5; // 0.5x - 1.5x
  const delay = Math.min(exponentialDelay * jitter, maxDelayMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Проверяет, является ли ошибка.retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof PynspdNetworkError) return true;
  if (error instanceof PynspdServerError) return true;
  if (error instanceof TooManyRequestsError) return true;
  return false;
}

/**
 * Парсит HTTP-статус и body в соответствующую ошибку
 */
export function parseHttpError(
  statusCode: number,
  responseBody: unknown,
  requestId?: string,
): Error {
  switch (statusCode) {
    case 403:
      return new BlockedIPError(
        `IP blocked by NSPD (403): ${JSON.stringify(responseBody)}`,
        statusCode,
        responseBody as Record<string, unknown>,
        requestId,
      );
    case 404:
      return new NotFoundError(
        `Resource not found (404): ${JSON.stringify(responseBody)}`,
        statusCode,
        responseBody as Record<string, unknown>,
        requestId,
      );
    case 429:
      return new TooManyRequestsError(
        `Too many requests to NSPD (429)`,
        statusCode,
        responseBody as Record<string, unknown>,
        requestId,
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return new PynspdServerError(
        `NSPD server error (${statusCode}): ${JSON.stringify(responseBody)}`,
        statusCode,
        responseBody as Record<string, unknown>,
        requestId,
      );
    default:
      return new UnknownResponseError(
        `NSPD HTTP error (${statusCode}): ${JSON.stringify(responseBody)}`,
        statusCode,
        responseBody as Record<string, unknown>,
        requestId,
      );
  }
}

/**
 * Базовый HTTP-клиент для работы с НСПД.
 * Реализует retry-политику, SSL bypass, кэширование и рандомизацию User-Agent.
 */
@Injectable()
export class NSPDClientService {
  private readonly logger = new Logger(NSPDClientService.name);
  private readonly config: NSPDClientConfig;
  private readonly httpsAgent = createHttpsAgent();
  private readonly cache = new Map<
    string,
    { data: unknown; expiry: number }
  >();

  constructor(private readonly configService: ConfigService) {
    const baseUrl =
      this.configService.get<string>('NSPD_BASE_URL') ||
      'https://nspd.gov.ru/api';

    const retriesRaw = this.configService.get<number>('NSPD_CLIENT_RETRIES');
    const retries = retriesRaw ?? 10;

    const retryOnBlockedIp =
      this.configService.get<string>('NSPD_CLIENT_RETRY_ON_BLOCKED_IP') ===
      'true';

    const cacheTtlMsRaw = this.configService.get<number>('NSPD_CACHE_TTL_MS');
    const cacheTtlMs = cacheTtlMsRaw ?? 3_600_000; // 1 hour

    this.config = {
      baseUrl,
      timeout: 30_000,
      retries,
      retryOnBlockedIp,
      cacheTtlMs,
    };
  }

  /** Текущая конфигурация */
  getConfig(): NSPDClientConfig {
    return { ...this.config };
  }

  /** Base URL для всех запросов */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  // ==================== Caching ====================

  /** Получить данные из кэша */
  getCache<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /** Сохранить данные в кэш */
  setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.config.cacheTtlMs,
    });
  }

  /** Очистить весь кэш */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('NSPD cache cleared');
  }

  /** Размер кэша */
  getCacheSize(): number {
    return this.cache.size;
  }

  // ==================== HTTP Request ====================

  /**
   * Выполнить GET-запрос к НСПД с retry-политикой и кэшированием.
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: { skipCache?: boolean; retryCount?: number },
  ): Promise<T> {
    const cacheKey = `GET:${path}:${JSON.stringify(params)}`;

    // Попытка из кэша
    if (!options?.skipCache) {
      const cached = this.getCache<T>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${path}`);
        return cached;
      }
    }

    const url = this.buildUrl(path, params);
    const retryCount = options?.retryCount ?? this.config.retries;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.fetchWithTimeout<T>(url);

        // Кэшируем успешный ответ
        if (!options?.skipCache) {
          this.setCache(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Не retry-блени ошибки
        if (!isRetryableError(error)) {
          throw error;
        }

        // Если это последняя попытка — выбрасываем
        if (attempt >= retryCount) {
          break;
        }

        // Retry-блени ошибки
        if (error instanceof BlockedIPError && !this.config.retryOnBlockedIp) {
          throw error;
        }

        this.logger.warn(
          `NSPD request failed (attempt ${attempt + 1}/${
            retryCount + 1
          }): ${path} - ${error instanceof Error ? error.message : error}`,
        );

        await sleepWithJitter(attempt);
      }
    }

    throw new PynspdNetworkError(
      `Failed to fetch ${path} after ${retryCount + 1} attempts`,
      lastError instanceof Error ? lastError : undefined,
    );
  }

  /**
   * Выполнить POST-запрос к НСПД с retry-политикой.
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options?: { retryCount?: number },
  ): Promise<T> {
    const url = this.buildUrl(path);
    const retryCount = options?.retryCount ?? this.config.retries;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.postWithTimeout<T>(url, body);
        return result;
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error)) {
          throw error;
        }

        if (attempt >= retryCount) {
          break;
        }

        if (error instanceof BlockedIPError && !this.config.retryOnBlockedIp) {
          throw error;
        }

        this.logger.warn(
          `NSPD POST request failed (attempt ${attempt + 1}/${
            retryCount + 1
          }): ${path} - ${error instanceof Error ? error.message : error}`,
        );

        await sleepWithJitter(attempt);
      }
    }

    throw new PynspdNetworkError(
      `Failed to POST ${path} after ${retryCount + 1} attempts`,
      lastError instanceof Error ? lastError : undefined,
    );
  }

  // ==================== Internal HTTP ====================

  /** Построить полный URL */
  buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.config.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /** Выполнить fetch с таймаутом (GET) */
  private async fetchWithTimeout<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await globalThis.fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
        // @ts-expect-error - node-fetch supports agent option
        agent: this.httpsAgent,
      });

      return await this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Выполнить fetch с таймаутом (POST) */
  private async postWithTimeout<T>(
    url: string,
    body: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await globalThis.fetch(url, {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        // @ts-expect-error - node-fetch supports agent option
        agent: this.httpsAgent,
      });

      return await this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Построить заголовки запроса */
  private buildHeaders(): Record<string, string> {
    return {
      'User-Agent': generateUserAgent(),
      Referer: 'https://nspd.gov.ru/map?thematic=PKK',
      Host: 'nspd.gov.ru',
    };
  }

  /** IP адрес НСПД (для обхода DNS-блокировок прокси) */
  async resolveNsdpIp(): Promise<string | null> {
    try {
      // Use DNS resolve via a simple TCP connection attempt
      const { createConnection } = await import('net');
      return new Promise<string | null>((resolve) => {
        const socket = createConnection(443, 'nspd.gov.ru', () => {
          const addr = (socket.remoteAddress as string) || null;
          socket.destroy();
          resolve(addr);
        });
        socket.setTimeout(5000);
        socket.on('error', () => {
          socket.destroy();
          resolve(null);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(null);
        });
      });
    } catch {
      return null;
    }
  }

  /** Обработать HTTP-ответ */
  private async handleResponse<T>(response: Response): Promise<T> {
    const requestId = response.headers.get('x-request-id') ?? undefined;
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      const error = parseHttpError(
        response.status,
        responseBody,
        requestId,
      );
      throw error;
    }

    return responseBody as T;
  }
}
