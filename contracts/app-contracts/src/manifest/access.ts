import {
  APP_RESOURCES,
  APP_PERMISSION_KEYS,
  APP_SCOPES,
  type AppResourceName,
  type AppPermissionKey,
  type AppPermissionKeyOf,
} from '../scopes.ts';
import type { AccessChange } from './changes-schema.ts';

/**
 * A manifest's access: what it is once parsed, how two versions of it differ and how the review
 * screen words it. Free of zod, so Admin can describe access without validating anything; the
 * field's schema is in `access-schema.ts`.
 */

/** A declared scope, with whether the app's backend may use it on its own. */
export interface AppAccessScope {
  readonly permission_key: AppPermissionKey;
  readonly backend: boolean;
}

/**
 * What a manifest's `access` field holds once parsed: one list of every scope the app declares,
 * in the registry's order, each once. A stored manifest groups it by resource again, in the
 * registry's order with `backend` written out, which the schema reads into this.
 */
export type AppAccess = readonly AppAccessScope[];

/**
 * The `access` field as a developer writes it, where `backend` may be left out. Each resource
 * takes only its own scopes.
 *
 * These types are written out rather than inferred from the schema, so the SDK's published
 * declarations need no zod. The schema checks it reads and writes them.
 */
export type AppAccessSource = {
  [R in AppResourceName]?: {
    scopes: { permission_key: AppPermissionKeyOf<R>; backend?: boolean }[];
  };
};

/** One line for a resource, as the review screen shows it. */
export interface AccessLine {
  readonly resource: AppResourceName;
  readonly title: string;
  /** Each scope's wording, one sentence per scope, in the registry's order. */
  readonly actions: readonly string[];
  readonly scopes: readonly AppPermissionKey[];
}

/** Describes scopes in the registry's words, one line per resource, in the registry's order. */
export function describeScopes(keys: Iterable<AppPermissionKey>): AccessLine[] {
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

/** Access as the review screen shows it: every scope, and the backend's apart. */
export interface AccessDescription {
  /** One line per resource, for every scope. */
  readonly lines: AccessLine[];
  /** One line per resource, for the scopes the backend may use on its own. */
  readonly backendLines: AccessLine[];
}

/** Describes access in the registry's words, with the scopes the backend may use apart. */
export function describeAccess(access: Iterable<AppAccessScope>): AccessDescription {
  const scopes = [...access];
  return {
    lines: describeScopes(scopes.map(({ permission_key: key }) => key)),
    backendLines: describeScopes(
      scopes.filter(({ backend }) => backend).map(({ permission_key: key }) => key),
    ),
  };
}

/**
 * The scopes approving a manifest grants: every scope its access declares, as every scope is
 * required.
 */
export function approvedScopes(access: AppAccess): ReadonlySet<AppPermissionKey> {
  return new Set(access.map(({ permission_key: key }) => key));
}

/** Whether a change widens access, so the publisher must approve it. */
export function widensAccess({ change }: Pick<AccessChange, 'change'>): boolean {
  return change === 'added' || change === 'backend_added';
}

/**
 * Compares access by meaning, not by position: a new scope, or one newly marked for the backend,
 * widens access and needs approval; a removed scope or resource, or `backend` turned off,
 * narrows it and applies at once. Reordering changes nothing. Without `before`, every scope is
 * new, as at install. Changes come in the registry's order.
 */
export function compareAccess(before: AppAccess | undefined, after: AppAccess): AccessChange[] {
  const old = new Map((before ?? []).map((scope) => [scope.permission_key, scope]));
  const now = new Map(after.map((scope) => [scope.permission_key, scope]));
  return APP_PERMISSION_KEYS.flatMap((key): AccessChange[] => {
    const was = old.get(key);
    const is = now.get(key);
    if (!was && is) {
      return [{ kind: 'access', scope: key, change: 'added', backend: is.backend }];
    }
    if (was && !is) {
      return [{ kind: 'access', scope: key, change: 'removed', backend: was.backend }];
    }
    if (was && is && was.backend !== is.backend) {
      return [
        {
          kind: 'access',
          scope: key,
          change: is.backend ? 'backend_added' : 'backend_removed',
          backend: is.backend,
        },
      ];
    }
    return [];
  });
}
