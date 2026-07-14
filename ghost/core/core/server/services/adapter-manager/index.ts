import GhostStorageBase from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import BaseCache from '@tryghost/adapter-base-cache';
import { RedirectsStoreBase } from '@tryghost/adapter-base-redirects';
import { RouteSettingsStoreBase } from '@tryghost/adapter-base-route-settings';

import {AdapterManager, type AdapterManagerOptions, type InferAdapterName} from './adapter-manager';
import {resolveAdapterOptions, normalizeAdapterConfig} from './utils';
import config from '../../../shared/config';

const adapterManagerOpts: AdapterManagerOptions = {
    loadAdapterFromPath: require,
    pathsToAdapters: [
        '', // A blank path will cause us to check node_modules for the adapter
        config.getContentPath('adapters'),
        config.get('paths').internalAdaptersPath
    ],
}

// chain registerAdapter calls to register all the base classes for the known
// adapter types - the type assertions only work when chained
const adapterManager = new AdapterManager(adapterManagerOpts)
    .registerAdapter('storage', GhostStorageBase)
    .registerAdapter('scheduling', SchedulingBase)
    .registerAdapter('sso', SSOBase)
    .registerAdapter('cache', BaseCache)
    .registerAdapter('redirects', RedirectsStoreBase)
    .registerAdapter('route-settings', RouteSettingsStoreBase);

function getAdapter<Name extends InferAdapterName<typeof adapterManager>>(name: Name) {
    // Re-read config on every call so runtime config changes (and test config
    // overrides) are reflected, matching the original JS implementation.
    const adapterServiceConfig = normalizeAdapterConfig(config);
    const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

    return adapterManager.getAdapter<Name>(name, adapterClassName, adapterConfig);
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
