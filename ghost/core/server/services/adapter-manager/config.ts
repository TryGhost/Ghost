import type { AdapterConfig, AdapterTypeConfig } from '../../../kernel/adapter-manager';
import type { ConfigInstance } from '../../../shared/config/loader';

function getSchedulingConfig(config: ConfigInstance): AdapterTypeConfig | undefined {
  const adapterConfig = config.get('adapters:scheduling');
  if (!adapterConfig) {
    const schedulingConfig = config.get('scheduling');
    if (schedulingConfig?.active) {
      return {
        active: schedulingConfig.active,
        [schedulingConfig.active]: {
          schedulerUrl: schedulingConfig?.schedulerUrl,
        },
      };
    }
  }

  return adapterConfig;
}

function normalizeAdapterPaths(
  config: ConfigInstance,
  key: 'redirects' | 'route-settings',
  defaultPathsByAdapter: Record<string, Record<string, string>>,
): AdapterTypeConfig | undefined {
  const adapterConfig = config.get(`adapters:${key}`);
  if (!adapterConfig) {
    return adapterConfig;
  }

  const normalized = { ...adapterConfig };
  for (const [adapterClassName, defaultPaths] of Object.entries(defaultPathsByAdapter)) {
    if (!normalized[adapterClassName]) {
      continue;
    }

    const storeConfig = { ...normalized[adapterClassName] };
    for (const [pathName, defaultPath] of Object.entries(defaultPaths)) {
      storeConfig[pathName] ||= defaultPath;
    }
    normalized[adapterClassName] = storeConfig;
  }

  return normalized;
}

/**
 * Ghost's adapter configuration, in the shape the kernel's adapter manager
 * resolves lookups from. Read on every lookup so runtime config changes are
 * reflected.
 *
 * Normalizes Ghost's config by ensuring that feature-specific adapter configs
 * are populated from top-level config if not explicitly provided: the legacy
 * top-level `storage` and `scheduling` blocks, isolation of the imports store,
 * and content-path defaults for the file-backed redirects and route-settings
 * stores.
 */
export function normalizeAdapterConfig(config: ConfigInstance): AdapterConfig {
  const adapterConfig = config.get('adapters');
  const storage = adapterConfig?.storage ?? config.get('storage');

  return {
    ...adapterConfig,
    // adapters.storage replaces the top-level storage config, defaults included, so carry
    // storage:imports over: import files must never fall back to the store that serves images.
    storage: adapterConfig?.storage
      ? { imports: config.get('storage:imports'), ...storage }
      : storage,
    scheduling: getSchedulingConfig(config),
    redirects: normalizeAdapterPaths(config, 'redirects', {
      FileStore: {
        basePath: config.getContentPath('data'),
      },
    }),
    'route-settings': normalizeAdapterPaths(config, 'route-settings', {
      FileStore: {
        basePath: config.getContentPath('settings'),
        defaultSettingsBasePath: config.get('paths:defaultRouteSettings'),
      },
      // The S3 store reads the bundled defaults off disk too, for the
      // empty-state response when the bucket holds no routes.yaml yet.
      S3RouteSettingsStore: {
        defaultSettingsBasePath: config.get('paths:defaultRouteSettings'),
      },
    }),
  };
}
