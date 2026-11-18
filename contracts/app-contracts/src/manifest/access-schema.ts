import { z } from 'zod';

import {
  APP_RESOURCES,
  APP_SCOPE_NAMES,
  APP_SCOPES,
  type AppResourceName,
  type AppScopeName,
  isAppScopeName,
} from '../scopes.ts';
import type { AppAccess } from './access.ts';

const RESOURCE_NAMES = Object.keys(APP_RESOURCES) as [AppResourceName, ...AppResourceName[]];

const scopeName = z.enum(APP_SCOPE_NAMES as [AppScopeName, ...AppScopeName[]], {
  error: (issue) =>
    typeof issue.input === 'string' && issue.input.includes('*')
      ? 'Expected a scope by its full name: wildcards are not allowed'
      : 'Expected a scope Ghost knows, such as post:read',
});

/**
 * Strict, so `optional` on a scope and `reason` on a resource are refused until Ghost does
 * something with them, and no developer thinks they already do.
 */
const accessScope = z.strictObject(
  {
    name: scopeName,
    // Whether the app's backend may use the scope on its own, with nobody present.
    backend: z.boolean('Expected true or false').default(false),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Expected only name and backend, not ${issue.keys.join(', ')}`
        : 'Expected a scope as an object with a name',
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
 * [{"name": "post:read", "backend": true}]}}`. Each key is Platform's object type, and each
 * scope keeps its full name, which must start with its key: checked here, once.
 */
const groupedAccess = z
  .partialRecord(z.enum(RESOURCE_NAMES), accessResource, {
    // An unknown resource is reported as an unrecognized key on the record.
    error: (issue: { code?: string; keys?: string[] }) =>
      issue.keys
        ? `Expected resources Ghost knows, such as post, not ${issue.keys.join(', ')}`
        : 'Expected an object of resources',
  })
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
          const name = (scope as { name?: unknown } | null)?.name;
          const path = [resource, 'scopes', index, 'name'];
          if (isAppScopeName(name) && APP_SCOPES[name].resource !== resource) {
            ctx.addIssue({
              code: 'custom',
              message: `Expected a ${resource} scope, as it is listed under ${resource}`,
              path,
            });
          }
          if (typeof name === 'string' && seen.has(name)) {
            ctx.addIssue({ code: 'custom', message: `Expected ${name} only once`, path });
          }
          seen.add(name);
        });
      }
    },
    { when: () => true },
  );

const flatAccess = z.array(
  z.strictObject({
    name: z.enum(APP_SCOPE_NAMES as [AppScopeName, ...AppScopeName[]]),
    backend: z.boolean(),
  }),
);

const registryOrder = new Map(APP_SCOPE_NAMES.map((name, index) => [name, index]));

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
      .sort((a, b) => registryOrder.get(a.name)! - registryOrder.get(b.name)!),
  encode: (scopes) => {
    const grouped: Partial<Record<AppResourceName, { scopes: AppAccess[number][] }>> = {};
    for (const resource of Object.keys(APP_RESOURCES) as AppResourceName[]) {
      const own = scopes
        .filter(({ name }) => APP_SCOPES[name].resource === resource)
        .sort((a, b) => registryOrder.get(a.name)! - registryOrder.get(b.name)!)
        .map(({ name, backend }) => ({ name, backend }));
      if (own.length) {
        grouped[resource] = { scopes: own };
      }
    }
    return grouped;
  },
});
