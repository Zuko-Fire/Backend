// src/modules/project/nspd/nspd.client.service.ts
// Базовый HTTP-клиент для работы с НСПД (вдохновлено pynspd)
// Использует Node.js https модуль для обхода self-signed SSL сертификатов

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
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
  const jitter = Math.random() * 0.5 + 0.5;
  const delay = Math.min(exponentialDelay * jitter, maxDelayMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Проверяет, является ли ошибка retryable
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
 * HTTP/HTTPS запрос через Node.js модуль (работает с self-signed SSL)
 */
function httpReq(
  method: 'GET' | 'POST',
  urlStr: string,
  body?: string,
  headers?: Record<string, string>,
  timeoutMs?: number,
): Promise<{ status: number; body: unknown; requestId?: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const mod = isHttps ? https : http;
    const agent = isHttps ? createHttpsAgent() : undefined;

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      agent,
      timeout: timeoutMs || 30000,
      headers: headers || {},
    };

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const requestId = res.headers['x-request-id'] as string | undefined;
        let responseBody: unknown;
        try {
          responseBody = JSON.parse(buffer.toString());
        } catch {
          responseBody = buffer.toString();
        }

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: responseBody, requestId });
        } else {
          reject({
            status: res.statusCode || 500,
            body: responseBody,
            requestId,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });

    if (body) req.write(body);
    req.end();
  });
}

/**
 * Базовый HTTP-клиент для работы с НСПД.
 */
@Injectable()
export class NSPDClientService {
  private readonly logger = new Logger(NSPDClientService.name);
  private readonly config: NSPDClientConfig;
  private readonly cache = new Map<string, { data: unknown; expiry: number }>();

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
    const cacheTtlMs = cacheTtlMsRaw ?? 3_600_000;

    this.config = {
      baseUrl,
      timeout: 30_000,
      retries,
      retryOnBlockedIp,
      cacheTtlMs,
    };
  }

  getConfig(): NSPDClientConfig {
    return { ...this.config };
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  // ==================== Caching ====================

  getCache<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiry: Date.now() + this.config.cacheTtlMs });
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('NSPD cache cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // ==================== HTTP Request ====================

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: { skipCache?: boolean; retryCount?: number },
  ): Promise<T> {
    const cacheKey = `GET:${path}:${JSON.stringify(params)}`;

    if (!options?.skipCache) {
      const cached = this.getCache<T>(cacheKey);
      if (cached) return cached;
    }

    const url = this.buildUrl(path, params);
    const retryCount = options?.retryCount ?? this.config.retries;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.httpGet<T>(url);
        if (!options?.skipCache) {
          this.setCache(cacheKey, result);
        }
        return result;
      } catch (error) {
        lastError = error;
        let status = 0;
        let body: unknown;
        if (error && typeof error === 'object' && 'status' in error) {
          status = error.status;
          body = error.body;
        }

        if (!isRetryableError(error)) {
          throw parseHttpError(status, body);
        }
        if (attempt >= retryCount) break;
        if (status === 403 && !this.config.retryOnBlockedIp) {
          throw parseHttpError(status, body);
        }

        this.logger.warn(
          `NSPD request failed (${attempt + 1}/${retryCount + 1}): ${path}`,
        );
        await sleepWithJitter(attempt);
      }
    }

    throw new PynspdNetworkError(
      `Failed to fetch ${path} after ${retryCount + 1} attempts`,
      lastError instanceof Error ? lastError : undefined,
    );
  }

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
        const result = await this.httpPost<T>(url, JSON.stringify(body));
        return result;
      } catch (error) {
        lastError = error;
        let status = 0;
        let bodyResp: unknown;
        if (error && typeof error === 'object' && 'status' in error) {
          status = error.status;
          bodyResp = error.body;
        }

        if (!isRetryableError(error)) {
          throw parseHttpError(status, bodyResp);
        }
        if (attempt >= retryCount) break;
        if (status === 403 && !this.config.retryOnBlockedIp) {
          throw parseHttpError(status, bodyResp);
        }

        this.logger.warn(
          `NSPD POST failed (${attempt + 1}/${retryCount + 1}): ${path}`,
        );
        await sleepWithJitter(attempt);
      }
    }

    throw new PynspdNetworkError(
      `Failed to POST ${path} after ${retryCount + 1} attempts`,
      lastError instanceof Error ? lastError : undefined,
    );
  }

  // ==================== Internal ====================

  buildUrl(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    const base = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl
      : this.config.baseUrl + '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(cleanPath, base);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async httpGet<T>(url: string): Promise<T> {
    const result = await httpReq(
      'GET',
      url,
      undefined,
      this.buildHeaders(),
      this.config.timeout,
    );
    return (result as any).body as T;
  }

  private async httpPost<T>(url: string, body: string): Promise<T> {
    const result = await httpReq(
      'POST',
      url,
      body,
      {
        ...this.buildHeaders(),
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
      },
      this.config.timeout,
    );
    return (result as any).body as T;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'User-Agent': generateUserAgent(),
      Referer: 'https://nspd.gov.ru/map?thematic=PKK',
      Host: 'nspd.gov.ru',
    };
  }

  async resolveNsdpIp(): Promise<string | null> {
    try {
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
}
