import {AdapterManager} from './adapter-manager';
import {adapterPaths} from './adapter-paths';
import {baseClasses} from './base-classes';
import config from '../../../shared/config';

// A singleton adapter manager, preconfigured with the base classes for every
// known adapter type. `getAdapter` resolves the active adapter and its options
// from config on each call, so runtime config changes are always reflected.
const adapterManager = new AdapterManager({
    loadAdapterFromPath: require,
    config,
    pathsToAdapters: adapterPaths,
    baseClasses
});

export default adapterManager;
