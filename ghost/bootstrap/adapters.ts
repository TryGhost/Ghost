import { StorageBase } from 'ghost-storage-base';
import { SchedulingBase } from '@tryghost/adapter-base-scheduling';
import { SSOBase } from '@tryghost/adapter-base-sso';
import { CacheBase } from '@tryghost/adapter-base-cache';
import { RedirectsStoreBase } from '@tryghost/adapter-base-redirects';
import { RouteSettingsStoreBase } from '@tryghost/adapter-base-route-settings';
import { JobsBackendBase } from '@tryghost/adapter-base-jobs';
import { UpgradeBase } from '@tryghost/adapter-base-upgrade';

import type { BaseClassMap } from '@tryghost/kernel/adapter-manager';
import type { ConfigInstance } from '../core/shared/config/loader';

// Ghost's values for the foundry's adapter manager: which adapter types exist,
// and where adapters are looked up. The foundry builds the manager from these.

/**
 * The base class every adapter of a given type must extend. Also read by
 * bin/validate-adapters.ts, so keep this the only place the mapping is declared.
 */
export const baseClasses = {
  storage: StorageBase,
  scheduling: SchedulingBase,
  sso: SSOBase,
  cache: CacheBase,
  redirects: RedirectsStoreBase,
  'route-settings': RouteSettingsStoreBase,
  jobs: JobsBackendBase,
  upgrade: UpgradeBase,
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
  upgrade: '@tryghost/adapter-base-upgrade',
} satisfies Record<keyof typeof baseClasses, string>;

/**
 * Where adapters are looked up, in order. Also read by bin/validate-adapters.ts,
 * which checks adapter implementations at build time - keep this the only place
 * the lookup order is declared, so a name resolves there exactly as it does here.
 */
export function buildAdapterPaths(config: ConfigInstance): string[] {
  return Array.from(
    new Set<string>([
      '', // A blank path will cause us to check node_modules for the adapter
      config.get('paths').internalAdaptersPath,

      // custom docker builds may install adapters in a separate path from content,
      // since the content dir is often bind-mounted into the container. Offering
      // an escape hatch here to allow for this
      config.get('paths').installedAdaptersPath ?? '',

      // load adapters from content last, so that they don't override any other
      // internal or platform-installed adapters
      // TODO: potentially deprecate/remove as part of Ghost 7.0
      config.getContentPath('adapters'),
    ]),
  );
}
