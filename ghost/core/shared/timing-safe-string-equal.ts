import crypto from 'crypto';

/**
 * Compares a value Ghost computed (an HMAC digest, say) with one taken from a
 * request, without the response time revealing how much of it matched.
 * Anything that is not a string never matches: a query param repeated in the
 * URL arrives as an array, and that is as wrong as a bad key.
 */
export function timingSafeStringEqual(expected: string, provided: unknown): boolean {
  if (typeof provided !== 'string') {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'utf16le');
  const providedBuffer = Buffer.from(provided, 'utf16le');

  // crypto.timingSafeEqual throws when the lengths differ. The digests compared
  // here have a fixed, public length, so returning early gives nothing away.
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
