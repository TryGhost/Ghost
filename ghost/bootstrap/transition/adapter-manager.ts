import { AdapterManager, loadAdapterClass } from '#foundry/adapter-manager';
import { buildAdapterPaths } from '../values/adapters/adapter-paths';
import { baseClasses, baseClassPackages } from '../values/adapters/base-classes';
import { normalizeAdapterConfig } from '../values/adapters/config';
import config from '../../core/shared/config';

/**
 * EARMARKED. Ghost's adapter manager: the foundry's loading, validation and instance cache, given
 * Ghost's adapter registry, search paths and configuration. `getAdapter` resolves the active
 * adapter and its options from config on each call, so a change of config is always reflected.
 *
 * It is built here, when this file is first loaded, and it is the one
 * `core/server/services/adapter-manager` returns, because legacy modules ask it for an adapter
 * while they are being imported. It leaves when whatever needs an adapter is handed one: the
 * application then builds the manager as it builds a service, and holds one for each site.
 */
export const adapterPaths: string[] = buildAdapterPaths(config);

const adapterManager = new AdapterManager({
  loadAdapterFromPath: require,
  getConfig: () => normalizeAdapterConfig(config),
  pathsToAdapters: adapterPaths,
  baseClasses,
});

export default adapterManager;

// For bin/validate-adapters.ts, which checks adapters as this manager would load them.
export { baseClasses, baseClassPackages, loadAdapterClass };
