/** Deliberate app guidance may be shown; provider/runtime errors stay in diagnostics. */
export class UserFacingError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'UserFacingError';
    this.cause = cause;
  }
}

export function messageForUser(error: unknown, fallback: string): string {
  const diagnostic = error instanceof UserFacingError ? error.cause : error;
  if (diagnostic && typeof __DEV__ !== 'undefined' && __DEV__) console.info('[BibleDept error]', diagnostic);
  if (error instanceof UserFacingError) return error.message;
  return fallback;
}
