import { z } from 'zod';
import { knownKeys } from './primitives';

const engineDescription =
  'Staff authentication engine. `better-auth` is in development and needs MySQL; on SQLite Ghost uses `legacy` and logs a warning.';

const legacyAuth = knownKeys('auth', {
  engine: z.literal('legacy').meta({ description: engineDescription }),
});

/** Keys only Better Auth reads go here, so a legacy config cannot carry them. */
const betterAuth = knownKeys('auth', {
  engine: z.literal('better-auth').meta({ description: engineDescription }),
});

/**
 * Staff authentication, a union on `engine`. The engine decides what boot
 * builds and how Express is wired. defaults.json supplies it, so it is always
 * present.
 *
 * Closed per engine: a key the chosen engine does not read, such as a Better
 * Auth option under `legacy`, is reported and stripped by `knownKeys`.
 */
export const auth = z.discriminatedUnion('engine', [legacyAuth, betterAuth]).meta({
  description: 'Staff authentication. Every other key depends on `engine`.',
  examples: [{ engine: 'legacy' }, { engine: 'better-auth' }],
});

export type AuthConfig = z.output<typeof auth>;
export type AuthEngine = AuthConfig['engine'];
