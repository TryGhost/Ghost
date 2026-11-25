import type { z } from 'zod';

import { decodeJson } from './keys.ts';

/** The only algorithm either key signs with. */
export const ALGORITHM = 'Ed25519';

/**
 * Reads a JWS protected header that must be exactly `shape`, which is a strict object. Any
 * other member could change what the signature covers, as `b64: false` does, or name
 * another key, so the header is checked before the signature and again when verifying.
 */
export function readExactHeader<T>(encoded: string, shape: z.ZodType<T>): T | undefined {
  const parsed = shape.safeParse(decodeJson(encoded));
  return parsed.success ? parsed.data : undefined;
}
