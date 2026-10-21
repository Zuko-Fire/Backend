import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

/**
 * Normalizes pagination parameters to safe values
 */
export function normalizePagination(
  page: number | string,
  limit: number | string,
): { page: number; limit: number } {
  const pageNum = Math.max(DEFAULT_PAGE, Number(page) || DEFAULT_PAGE);
  const limitNum = Math.min(
    MAX_PAGE_SIZE,
    Math.max(DEFAULT_PAGE_SIZE, Number(limit) || DEFAULT_PAGE_SIZE),
  );

  return { page: pageNum, limit: limitNum };
}

/**
 * Creates a paginated response wrapper
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
