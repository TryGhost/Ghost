/** Whether a caught value is a Node system error, which has a `code` such as `ENOENT`. */
export function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

/** A caught value's message: an Error's own, or the value as text. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
