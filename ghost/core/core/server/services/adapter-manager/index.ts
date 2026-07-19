import GhostStorageBase from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import BaseCache from '@tryghost/adapter-base-cache';
import { RedirectsStoreBase } from '@tryghost/adapter-base-redirects';
import { RouteSettingsStoreBase } from '@tryghost/adapter-base-route-settings';

import {AdapterManager} from './adapter-manager';
import config from '../../../shared/config';

// A singleton adapter manager, preconfigured with the base classes for every
// known adapter type. `getAdapter` resolves the active adapter and its options
// from config on each call, so runtime config changes are always reflected.
const adapterManager = new AdapterManager({
    loadAdapterFromPath: require,
    config,
    pathsToAdapters: [
        '', // A blank path will cause us to check node_modules for the adapter
        config.getContentPath('adapters'),
        config.get('paths').internalAdaptersPath
    ],
    baseClasses: {
        storage: GhostStorageBase,
        scheduling: SchedulingBase,
        sso: SSOBase,
        cache: BaseCache,
        redirects: RedirectsStoreBase,
        'route-settings': RouteSettingsStoreBase
    }
});

export default adapterManager;
