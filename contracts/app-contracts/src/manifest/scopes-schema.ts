import { z } from 'zod';

import { APP_PERMISSION_KEYS, type AppPermissionKey } from '../scopes.ts';

const KEYS = APP_PERMISSION_KEYS as [AppPermissionKey, ...AppPermissionKey[]];

const permissionKey = z.enum(KEYS, {
  error: (issue) =>
    typeof issue.input === 'string' && issue.input.includes('*')
      ? 'Expected a full permission key: wildcards are not allowed'
      : 'Expected a permission key Ghost knows, such as post:read',
});

const registryOrder = new Map(APP_PERMISSION_KEYS.map((key, index) => [key, index]));

const byRegistryOrder = (keys: readonly AppPermissionKey[]) =>
  [...keys].sort((a, b) => registryOrder.get(a)! - registryOrder.get(b)!);

/**
 * The `scopes` field: the permission keys an app needs, such as `["post:browse", "post:edit"]`.
 * `[]` asks for nothing. Each key is written in full and listed once. It reads into, and is
 * stored in, the registry's order, so the same scopes always store, and digest, the same way.
 */
export const AppScopesSchema = z.codec(
  z.array(permissionKey, 'Expected a list of permission keys').superRefine(
    (keys, ctx) => {
      const seen = new Set<AppPermissionKey>();
      keys.forEach((key, index) => {
        if (!registryOrder.has(key)) {
          return;
        }
        if (seen.has(key)) {
          ctx.addIssue({ code: 'custom', message: `Expected ${key} only once`, path: [index] });
        }
        seen.add(key);
      });
    },
    // Also when some keys are refused, so every problem is reported at once. Not when the
    // value isn't a list at all.
    { when: ({ issues }) => issues.every(({ path = [] }) => path.length > 0) },
  ),
  z.array(z.enum(KEYS)),
  { decode: byRegistryOrder, encode: byRegistryOrder },
);

/**
 * Why a manifest with `optional_scopes` is refused: until Ghost does something with optional
 * scopes, so no developer thinks it already does.
 */
export const OPTIONAL_SCOPES_REFUSED = 'Optional scopes aren’t supported yet';
