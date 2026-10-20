/**
 * Removes sensitive fields from a user-like object
 */
export function sanitizeUser(user: Record<string, unknown>): Record<string, unknown> {
  const { password, refreshTokens, ...sanitized } = user;
  return sanitized;
}

/**
 * Sanitizes an array of user objects
 */
export function sanitizeUsers<T extends Record<string, unknown>>(users: T[]): T[] {
  return users.map((user) => sanitizeUser(user) as T);
}
