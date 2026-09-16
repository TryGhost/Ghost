import { StorageBase } from 'ghost-storage-base';
import { SchedulingBase } from '@tryghost/adapter-base-scheduling';
import { SSOBase } from '@tryghost/adapter-base-sso';
import { CacheBase } from '@tryghost/adapter-base-cache';
import { RedirectsStoreBase } from '@tryghost/adapter-base-redirects';
import { RouteSettingsStoreBase } from '@tryghost/adapter-base-route-settings';
import { JobsBackendBase } from '@tryghost/adapter-base-jobs';

import type { BaseClassMap } from './adapter-manager';

/**
 * The base class every adapter of a given type must extend. Also read by
 * bin/validate-adapters.js, so keep this the only place the mapping is declared.
 */
export const baseClasses = {
  storage: StorageBase,
  scheduling: SchedulingBase,
  sso: SSOBase,
  cache: CacheBase,
  redirects: RedirectsStoreBase,
  'route-settings': RouteSettingsStoreBase,
  jobs: JobsBackendBase,
} satisfies BaseClassMap;

/**
 * The package each base class above is imported from. An adapter that installs
 * one of these itself gets a second copy of the base class - a different function
 * object, so `instanceof` fails and Ghost falls back to comparing class names.
 * bin/validate-adapters.js fails a build on such a duplicate, where a duplicate
 * of any other package is only reported.
 *
 * Keyed by adapter type so `satisfies` demands an entry per type in
 * `baseClasses`; a unit test keeps the names matching the imports above.
 */
export const baseClassPackages = {
  storage: 'ghost-storage-base',
  scheduling: '@tryghost/adapter-base-scheduling',
  sso: '@tryghost/adapter-base-sso',
  cache: '@tryghost/adapter-base-cache',
  redirects: '@tryghost/adapter-base-redirects',
  'route-settings': '@tryghost/adapter-base-route-settings',
  jobs: '@tryghost/adapter-base-jobs',
} satisfies Record<keyof typeof baseClasses, string>;
