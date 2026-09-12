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
 * bin/validate-adapters.js, which checks adapter implementations at build time -
 * keep this the only place the mapping is declared.
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
 * The package each base class above is imported from, keyed by adapter type so
 * that `satisfies` makes the compiler demand one entry per type in
 * `baseClasses` - a new adapter type can't be added without naming its package.
 *
 * An adapter that installs one of these itself gets a second copy of the base
 * class, which is a different function object - so `instanceof` fails and
 * Ghost has to fall back to comparing class names. bin/validate-adapters.js
 * uses this list to fail a build on such a duplicate, where a duplicate of any
 * other package is only reported.
 *
 * The names have to match the imports at the top of this file; a unit test keeps
 * the two in sync.
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
