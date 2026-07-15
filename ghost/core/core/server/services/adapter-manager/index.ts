import GhostStorageBase from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import BaseCache from '@tryghost/adapter-base-cache';
import {RedirectsStoreBase} from '@tryghost/adapter-base-redirects';
import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';

import {AdapterManager} from './adapter-manager';
import type {AdapterName} from './types';
import {resolveAdapterOptions, normalizeAdapterConfig} from './utils';
import config from '../../../shared/config';

// The base classes for all known adapter types. This map is both the runtime
// registry and the type-level source of truth: `getAdapter` accepts these keys
// (optionally suffixed with ":feature") and returns the matching instance type.
const baseClasses = {
    storage: GhostStorageBase,
    scheduling: SchedulingBase,
    sso: SSOBase,
    cache: BaseCache,
    redirects: RedirectsStoreBase,
    'route-settings': RouteSettingsStoreBase
};

const adapterManager = new AdapterManager({
    baseClasses,
    loadAdapterFromPath: require,
    pathsToAdapters: [
        '', // A blank path will cause us to check node_modules for the adapter
        config.getContentPath('adapters'),
        config.get('paths').internalAdaptersPath
    ]
});

function getAdapter<Name extends AdapterName<typeof baseClasses>>(name: Name) {
    // Re-read config on every call so runtime config changes (and test config
    // overrides) are reflected, matching the original JS implementation.
    const adapterServiceConfig = normalizeAdapterConfig(config);
    const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

    return adapterManager.getAdapter(name, adapterClassName, adapterConfig);
}

function clearCache() {
    adapterManager.clearInstanceCache();
}

// NOTE: exported via `module.exports` (rather than ESM named exports) so that
// consumers keep `require(...).getAdapter` access AND tests can stub methods
// with sinon — ESM named exports compile to immutable bindings that sinon
// cannot stub. Using `module.exports` directly (not `export =`) keeps this
// compatible with the erasableSyntaxOnly compiler option.
module.exports = {getAdapter, clearCache};
