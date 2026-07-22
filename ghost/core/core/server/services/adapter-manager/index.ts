import {StorageBase} from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import {CacheBase} from '@tryghost/adapter-base-cache';
import {RedirectsStoreBase} from '@tryghost/adapter-base-redirects';
import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';

import {AdapterManager} from './adapter-manager';
import config from '../../../shared/config';

const adapterPaths = new Set<string>([
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
]);

// A singleton adapter manager, preconfigured with the base classes for every
// known adapter type. `getAdapter` resolves the active adapter and its options
// from config on each call, so runtime config changes are always reflected.
const adapterManager = new AdapterManager({
    loadAdapterFromPath: require,
    config,
    pathsToAdapters: Array.from(adapterPaths),
    baseClasses: {
        storage: StorageBase,
        scheduling: SchedulingBase,
        sso: SSOBase,
        cache: CacheBase,
        redirects: RedirectsStoreBase,
        'route-settings': RouteSettingsStoreBase
    }
});

export default adapterManager;
