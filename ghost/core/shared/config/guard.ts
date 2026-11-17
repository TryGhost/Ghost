import { guardReadOnly as guard } from '../../foundation/config/guard';

/**
 * When Ghost's config is guarded rather than frozen. The guard itself is the
 * framework's: see ../../foundation/config/guard.ts.
 *
 * Whether writes to config should throw rather than be dropped.
 *
 * Matches the environments ./validated.ts validates strictly, for the same
 * reason: a mistake should fail a developer's boot or CI, not a live site.
 * `GHOST_CONFIG_GUARD` overrides in either direction.
 */
export function shouldGuard(env: string): boolean {
  const override = process.env.GHOST_CONFIG_GUARD;

  if (override !== undefined) {
    return override === 'true';
  }

  return env === 'development' || env.startsWith('test');
}

export const guardHint = 'see core/shared/config/SCHEMA.md';

/** Wrap a config tree so that any write throws, naming the key path. */
export function guardReadOnly<T>(tree: T, path = ''): T {
  return guard(tree, path, guardHint);
}
