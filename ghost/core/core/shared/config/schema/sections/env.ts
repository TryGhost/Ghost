import { z } from 'zod';

/**
 * Set by the loader from `getNodeEnv()`, so it is always a non-empty string.
 * Not an enum: Ghost is run under custom NODE_ENV values (`testing-mysql`, and
 * whatever an embedder picks) and rejecting those would be a boot failure.
 */
export const envSchema = z.string().min(1);
