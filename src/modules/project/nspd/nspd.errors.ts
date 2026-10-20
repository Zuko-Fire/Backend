// src/modules/project/nspd/nspd.errors.ts
// Иерархия ошибок НСПД (вдохновлено pynspd)

/**
 * Базовый класс для всех ошибок pynspd-клиента
 */
export class PynspdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PynspdError';
  }
}

/**
 * Слой не найден по названию или category_id
 */
export class UnknownLayerError extends PynspdError {
  constructor(
    public readonly layerName?: string,
    public readonly categoryId?: number,
  ) {
    super(
      `Layer not found: ${layerName ?? `category_id=${categoryId}`}`,
    );
    this.name = 'UnknownLayerError';
  }
}

/**
 * Поиск дал неоднозначный результат (>1 объект)
 */
export class AmbiguousSearchError extends PynspdError {
  constructor(
    public readonly query: string,
    public readonly count: number,
  ) {
    super(`Ambiguous search for "${query}": ${count} results found`);
    this.name = 'AmbiguousSearchError';
  }
}

/**
 * Область поиска слишком большая для одного запроса
 */
export class TooBigContourError extends PynspdError {
  constructor(
    public readonly area?: number,
  ) {
    super(`Contour area is too large: ${area}`);
    this.name = 'TooBigContourError';
  }
}

/**
 * Базовый класс для ошибок HTTP-ответов НСПД
 */
export abstract class PynspdResponseError extends PynspdError {
  public readonly statusCode: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    public readonly responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message);
    this.name = 'PynspdResponseError';
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

/**
 * Серверная ошибка НСПД (5xx)
 */
export class PynspdServerError extends PynspdResponseError {
  constructor(
    message: string,
    statusCode: number,
    responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message, statusCode, responseBody, requestId);
    this.name = 'PynspdServerError';
  }
}

/**
 * Неизвестная ошибка ответа НСПД (другие коды)
 */
export class UnknownResponseError extends PynspdResponseError {
  constructor(
    message: string,
    statusCode: number,
    responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message, statusCode, responseBody, requestId);
    this.name = 'UnknownResponseError';
  }
}

/**
 * IP заблокирован со стороны НСПД (403)
 */
export class BlockedIPError extends PynspdResponseError {
  constructor(
    message = 'IP blocked by NSPD (403)',
    statusCode = 403,
    responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message, statusCode, responseBody, requestId);
    this.name = 'BlockedIPError';
  }
}

/**
 * Слишком много запросов (429)
 */
export class TooManyRequestsError extends PynspdResponseError {
  constructor(
    message = 'Too many requests to NSPD (429)',
    statusCode = 429,
    responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message, statusCode, responseBody, requestId);
    this.name = 'TooManyRequestsError';
  }
}

/**
 * Объект не найден (404)
 */
export class NotFoundError extends PynspdResponseError {
  constructor(
    message = 'Resource not found (404)',
    statusCode = 404,
    responseBody?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message, statusCode, responseBody, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Ошибка сети / таймаут
 */
export class PynspdNetworkError extends PynspdError {
  public readonly originalError?: Error;

  constructor(
    message: string,
    originalError?: Error,
  ) {
    super(message);
    this.name = 'PynspdNetworkError';
    this.originalError = originalError;
  }
}
