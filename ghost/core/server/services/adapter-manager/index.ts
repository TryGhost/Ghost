import { AdapterManager } from '../../../kernel/adapter-manager';
import { adapterPaths } from './adapter-paths';
import { baseClasses } from './base-classes';
import { normalizeAdapterConfig } from './config';
import config from '../../../shared/config';

// Ghost's configured adapter manager: the kernel's generic loading, validation
// and instance management, composed with Ghost's adapter registry, search paths,
// module loader and configuration. `getAdapter` resolves the active adapter and
// its options from config on each call, so runtime config changes are always
// reflected. Boot validates the configured adapters with `init()`.
const adapterManager = new AdapterManager({
  loadAdapterFromPath: require,
  getConfig: () => normalizeAdapterConfig(config),
  pathsToAdapters: adapterPaths,
  baseClasses,
});

export default adapterManager;
