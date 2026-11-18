import {
  APP_RESOURCES,
  APP_SCOPE_NAMES,
  APP_SCOPES,
  type AppResourceName,
  type AppScopeName,
  type AppScopeNameOf,
} from '../scopes.ts';

/**
 * A manifest's access: what it is once parsed, how two versions of it differ and how the review
 * screen words it. Free of zod, so Admin can describe access without validating anything; the
 * field's schema is in `access-schema.ts`.
 */

/** A declared scope, with whether the app's backend may use it on its own. */
export interface AppAccessScope {
  readonly name: AppScopeName;
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
 */
export type AppAccessSource = {
  [R in AppResourceName]?: { scopes: { name: AppScopeNameOf<R>; backend?: boolean }[] };
};

/** One line for a resource, as the review screen shows it. */
export interface AccessLine {
  readonly resource: AppResourceName;
  readonly title: string;
  /** Each scope's wording, one sentence per scope, in the registry's order. */
  readonly actions: readonly string[];
  readonly scopes: readonly AppScopeName[];
}

/** Describes scopes in the registry's words, one line per resource, in the registry's order. */
export function describeScopes(names: Iterable<AppScopeName>): AccessLine[] {
  const wanted = new Set(names);
  return (Object.keys(APP_RESOURCES) as AppResourceName[]).flatMap((resource) => {
    const scopes = APP_SCOPE_NAMES.filter(
      (name) => wanted.has(name) && APP_SCOPES[name].resource === resource,
    );
    if (scopes.length === 0) {
      return [];
    }
    return [
      {
        resource,
        title: APP_RESOURCES[resource].title,
        actions: scopes.map((name) => APP_SCOPES[name].wording),
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
    lines: describeScopes(scopes.map(({ name }) => name)),
    backendLines: describeScopes(scopes.filter(({ backend }) => backend).map(({ name }) => name)),
  };
}

/**
 * The scopes approving a manifest grants: every scope its access declares, as every scope is
 * required.
 */
export function approvedScopes(access: AppAccess): ReadonlySet<AppScopeName> {
  return new Set(access.map(({ name }) => name));
}

/**
 * How access differs between two versions of a manifest, one scope at a time. Ghost sends
 * changes in this shape, in a preview and in an installation's history.
 */
export interface AccessChange {
  readonly kind: 'access';
  readonly scope: AppScopeName;
  /**
   * `added` and `removed` are the scope itself. `backend_added` and `backend_removed` are a scope
   * declared on both sides that the backend may now, or no longer, use on its own.
   */
  readonly change: 'added' | 'removed' | 'backend_added' | 'backend_removed';
  /** For an added scope, whether the backend may use it; for a removed one, whether it could. */
  readonly backend: boolean;
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
  const old = new Map((before ?? []).map((scope) => [scope.name, scope]));
  const now = new Map(after.map((scope) => [scope.name, scope]));
  return APP_SCOPE_NAMES.flatMap((name): AccessChange[] => {
    const was = old.get(name);
    const is = now.get(name);
    if (!was && is) {
      return [{ kind: 'access', scope: name, change: 'added', backend: is.backend }];
    }
    if (was && !is) {
      return [{ kind: 'access', scope: name, change: 'removed', backend: was.backend }];
    }
    if (was && is && was.backend !== is.backend) {
      return [
        {
          kind: 'access',
          scope: name,
          change: is.backend ? 'backend_added' : 'backend_removed',
          backend: is.backend,
        },
      ];
    }
    return [];
  });
}
