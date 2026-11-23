import {
  APP_RESOURCES,
  APP_PERMISSION_KEYS,
  APP_SCOPES,
  type AppResourceName,
  type AppPermissionKey,
} from '../scopes.ts';

/**
 * How the review screen words scopes. Free of zod, so Admin can describe them without
 * validating anything.
 */

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
