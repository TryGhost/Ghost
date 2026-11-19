import { z } from 'zod';

import {
  APP_RESOURCES,
  APP_PERMISSION_KEYS,
  APP_SCOPES,
  type AppResourceName,
  type AppPermissionKey,
  isAppPermissionKey,
} from '../scopes.ts';
import type { AppAccess, AppAccessScope } from './access.ts';

const RESOURCE_NAMES = Object.keys(APP_RESOURCES) as [AppResourceName, ...AppResourceName[]];

const permissionKey = z.enum(APP_PERMISSION_KEYS as [AppPermissionKey, ...AppPermissionKey[]], {
  error: (issue) =>
    typeof issue.input === 'string' && issue.input.includes('*')
      ? 'Expected a full permission key: wildcards are not allowed'
      : 'Expected a permission key Ghost knows, such as post:read',
});

/**
 * Strict, so `optional` on a scope and `reason` on a resource are refused until Ghost does
 * something with them, and no developer thinks they already do.
 */
const accessScope = z.strictObject(
  {
    permission_key: permissionKey,
    // Whether the app's backend may use the scope on its own, with nobody present.
    backend: z.boolean('Expected true or false').default(false),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Expected only permission_key and backend, not ${issue.keys.join(', ')}`
        : 'Expected a scope as an object with a permission_key',
  },
);

const accessResource = z.strictObject(
  {
    scopes: z.array(accessScope, 'Expected a list of scopes').min(1, 'Expected at least one scope'),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Expected only scopes, not ${issue.keys.join(', ')}`
        : 'Expected an object with a list of scopes',
  },
);

/**
 * The `access` field as a developer writes it, grouped by resource: `{"post": {"scopes":
 * [{"permission_key": "post:read", "backend": true}]}}`. Each key is Platform's object type, and
 * each scope's permission key is written in full and must start with its resource: checked here,
 * once.
 */
const groupedAccess = z
  // An object with one optional key per resource, not a record, so every unknown key is refused,
  // `__proto__` included.
  .strictObject(
    Object.fromEntries(RESOURCE_NAMES.map((resource) => [resource, accessResource.optional()])) as {
      [R in AppResourceName]: z.ZodOptional<typeof accessResource>;
    },
    {
      error: (issue) =>
        issue.code === 'unrecognized_keys'
          ? `Expected resources Ghost knows, such as post, not ${issue.keys.join(', ')}`
          : 'Expected an object of resources',
    },
  )
  // Runs even when another part of `access` is wrong, so a developer sees every problem at once.
  // The value may then be only partly valid, so it's read as unknown.
  .superRefine(
    (access: unknown, ctx) => {
      if (access === null || typeof access !== 'object' || Array.isArray(access)) {
        return;
      }
      for (const [resource, entry] of Object.entries(access)) {
        const scopes = (entry as { scopes?: unknown } | null)?.scopes;
        if (!Array.isArray(scopes)) {
          continue;
        }
        const seen = new Set<unknown>();
        scopes.forEach((scope: unknown, index) => {
          const key = (scope as { permission_key?: unknown } | null)?.permission_key;
          const path = [resource, 'scopes', index, 'permission_key'];
          if (isAppPermissionKey(key) && APP_SCOPES[key].resource !== resource) {
            ctx.addIssue({
              code: 'custom',
              message: `Expected a ${resource} scope, as it is listed under ${resource}`,
              path,
            });
          }
          if (typeof key === 'string' && seen.has(key)) {
            ctx.addIssue({ code: 'custom', message: `Expected ${key} only once`, path });
          }
          seen.add(key);
        });
      }
    },
    { when: () => true },
  );

const flatScope = z.strictObject({
  permission_key: z.enum(APP_PERMISSION_KEYS as [AppPermissionKey, ...AppPermissionKey[]]),
  backend: z.boolean(),
});

const flatAccess = z.array(flatScope) satisfies z.ZodType<AppAccess>;

const registryOrder = new Map(APP_PERMISSION_KEYS.map((key, index) => [key, index]));

/**
 * The `access` field: what an app needs from the site. It reads the developer's grouped form into
 * one list in the registry's order, which is what Ghost compares, describes and checks. It writes
 * that back grouped by resource, in the registry's order and with `backend` written out, so the
 * same access is always stored, and digested, the same way. `{}` asks for nothing.
 */
export const AppAccessSchema = z.codec(groupedAccess, flatAccess, {
  decode: (grouped) =>
    Object.values(grouped)
      .flatMap((entry) => entry?.scopes ?? [])
      .sort((a, b) => registryOrder.get(a.permission_key)! - registryOrder.get(b.permission_key)!),
  encode: (scopes) => {
    const grouped: Partial<Record<AppResourceName, { scopes: AppAccessScope[] }>> = {};
    for (const resource of Object.keys(APP_RESOURCES) as AppResourceName[]) {
      const own = scopes
        .filter((scope) => APP_SCOPES[scope.permission_key].resource === resource)
        .sort((a, b) => registryOrder.get(a.permission_key)! - registryOrder.get(b.permission_key)!)
        .map(({ permission_key: key, backend }) => ({ permission_key: key, backend }));
      if (own.length) {
        grouped[resource] = { scopes: own };
      }
    }
    return grouped;
  },
});
