/**
 * Removes sensitive fields from a user-like object
 */
export function sanitizeUser<T extends Record<string, unknown>>(
  user: T,
): Omit<T, 'password' | 'refreshTokens'> {
  const { password, refreshTokens, ...sanitized } = user;
  return sanitized;
}

/**
 * Sanitizes an array of user objects
 */
export function sanitizeUsers<T extends Record<string, unknown>>(
  users: T[],
): Omit<T, 'password' | 'refreshTokens'>[] {
  return users.map((user) => sanitizeUser(user));
}

/**
 * Removes password from owner object in project data
 */
export function sanitizeOwner(
  owner: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!owner) return undefined;
  const { password, ...sanitized } = owner;
  return sanitized;
}

/**
 * Removes password from member user object
 */
export function sanitizeMemberUser(
  member: Record<string, unknown>,
): Record<string, unknown> {
  const user = member.user as Record<string, unknown> | undefined;
  if (!user) return member;

  const { password, ...sanitized } = user;
  return { ...member, user: sanitized || undefined };
}
