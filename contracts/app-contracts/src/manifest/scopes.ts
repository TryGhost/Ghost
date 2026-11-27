import {
  APP_RESOURCES,
  APP_PERMISSION_KEYS,
  APP_SCOPES,
  type AppResourceName,
  type AppPermissionKey,
} from '../scopes.ts';
import type { ScopeChange } from './changes-schema.ts';

/**
 * A manifest's access: how two versions of its scopes differ, what approving it grants and how
 * the review screen words scopes. Free of zod, so Admin can use it without validating anything;
 * the field's schema is in `scopes-schema.ts`.
 */

/** One line for a resource, as the review screen shows it. */
export interface ScopeLine {
  readonly resource: AppResourceName;
  readonly title: string;
  /** Each scope's wording, one entry per scope, in the registry's order. */
  readonly actions: readonly string[];
  readonly scopes: readonly AppPermissionKey[];
}

/** Describes scopes in the registry's words, one line per resource, in the registry's order. */
export function describeScopes(keys: Iterable<AppPermissionKey>): ScopeLine[] {
  const wanted = new Set(keys);
  return (Object.keys(APP_RESOURCES) as AppResourceName[]).flatMap((resource) => {
    const scopes = APP_PERMISSION_KEYS.filter(
      (key) => wanted.has(key) && APP_SCOPES[key].resource === resource,
    );
    if (scopes.length === 0) {
      return [];
    }
    return [
      {
        resource,
        title: APP_RESOURCES[resource].title,
        actions: scopes.map((key) => APP_SCOPES[key].wording),
        scopes,
      },
    ];
  });
}

/** The scopes approving a manifest grants: every scope it lists, as every scope is required. */
export function approvedScopes(scopes: readonly AppPermissionKey[]): ReadonlySet<AppPermissionKey> {
  return new Set(scopes);
}

/** Whether a change widens access, so the publisher must approve it. */
export function widensAccess({ change }: Pick<ScopeChange, 'change'>): boolean {
  return change === 'added';
}

/**
 * Compares scopes by meaning, not by position: a new scope widens access and needs approval, a
 * removed one narrows it and applies at once, and reordering changes nothing. Without `before`,
 * every scope is new, as at install. Changes come in the registry's order.
 */
export function compareScopes(
  before: readonly AppPermissionKey[] | undefined,
  after: readonly AppPermissionKey[],
): ScopeChange[] {
  const was = new Set(before ?? []);
  const is = new Set(after);
  return APP_PERMISSION_KEYS.flatMap((key): ScopeChange[] => {
    if (!was.has(key) && is.has(key)) {
      return [{ kind: 'scope', scope: key, change: 'added' }];
    }
    if (was.has(key) && !is.has(key)) {
      return [{ kind: 'scope', scope: key, change: 'removed' }];
    }
    return [];
  });
}
