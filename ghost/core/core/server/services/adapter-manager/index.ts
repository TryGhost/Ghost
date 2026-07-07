import GhostStorageBase from 'ghost-storage-base';
import {SchedulingBase} from '@tryghost/adapter-base-scheduling';
import {SSOBase} from '@tryghost/adapter-base-sso';
import BaseCache from '@tryghost/adapter-base-cache';
import {RedirectsStoreBase} from '@tryghost/adapter-base-redirects';
import {RouteSettingsStoreBase} from '@tryghost/adapter-base-route-settings';

import {AdapterManager} from './adapter-manager';
import config from '../../../shared/config';
import type {ConfigInstance} from '../../../shared/config/loader';
import createFacade from '../../../shared/container/create-facade';

const baseClasses = {
    storage: GhostStorageBase,
    scheduling: SchedulingBase,
    sso: SSOBase,
    cache: BaseCache,
    redirects: RedirectsStoreBase,
    'route-settings': RouteSettingsStoreBase
};

/**
 * Builds an adapter manager for one scope. `getAdapter` resolves the active
 * adapter and its options from the given config on each call, so runtime
 * config changes are always reflected.
 */
export const createAdapterManager = ({config: configInstance, pathsToAdapters}: {config: ConfigInstance; pathsToAdapters: string[]}) => {
    return new AdapterManager({
        loadAdapterFromPath: require,
        config: configInstance,
        pathsToAdapters,
        baseClasses
    });
};

// Booted processes serve the scope's manager; bare processes fall back to one
// built from global config
export default createFacade<AdapterManager<typeof baseClasses>>('adapterManager', () => createAdapterManager({
    config,
    pathsToAdapters: [
        '', // A blank path will cause us to check node_modules for the adapter
        config.getContentPath('adapters'),
        config.get('paths').internalAdaptersPath
    ]
}));
