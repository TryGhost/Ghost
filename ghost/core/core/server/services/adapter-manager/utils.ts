import type {AdapterConstructor} from "./types";
import type {ConfigInstance} from '../../../shared/config/loader';

/**
* Resolve an adapter export to a constructor function, handling both CommonJS and ES module formats.
*/
export function resolveAdapterExport(moduleExport: unknown): AdapterConstructor | null {
    if (!moduleExport) {
        return null;
    }

    if (typeof moduleExport === "function") {
        return moduleExport as AdapterConstructor;
    }

    if (typeof moduleExport === "object" && "default" in moduleExport && typeof moduleExport.default === "function") {
        return moduleExport.default as AdapterConstructor;
    }

    return null;
}

function getSchedulingConfig(config: ConfigInstance) {
    const adapterConfig = config.get('adapters:scheduling');
    if (!adapterConfig) {
        const schedulingConfig = config.get('scheduling');
        if (schedulingConfig?.active) {
            return {
                active: schedulingConfig.active,
                [schedulingConfig.active]: {
                    schedulerUrl: schedulingConfig?.schedulerUrl,
                }
            };
        }
    }

    return adapterConfig;
}

function normalizeFilestoreConfig(config: ConfigInstance, key: 'redirects' | 'route-settings', defaultPaths: Record<string, string>) {
    const adapterConfig = config.get(`adapters:${key}`);
    if (!adapterConfig?.FileStore) {
        return adapterConfig;
    }

    const fileStoreConfig = {...adapterConfig.FileStore};
    for (const [pathName, defaultPath] of Object.entries(defaultPaths)) {
        fileStoreConfig[pathName] ||= defaultPath;
    }

    return {
        ...adapterConfig,
        FileStore: fileStoreConfig
    }
}

/**
* Normalize adapter config by ensuring that feature-specific adapter configs
* are populated from top-level config if not explicitly provided.
*/
export function normalizeAdapterConfig(config: ConfigInstance) {
    const adapterConfig = config.get('adapters');

    return {
        ...adapterConfig,
        storage: adapterConfig?.storage ?? config.get('storage'),
        scheduling: getSchedulingConfig(config),
        redirects: normalizeFilestoreConfig(config, 'redirects', {
            basePath: config.getContentPath('data')
        }),
        'route-settings': normalizeFilestoreConfig(config, 'route-settings', {
            basePath: config.getContentPath('settings'),
            defaultSettingsBasePath: config.get('paths:defaultRouteSettings')
        }),
    }
}

/**
* Return the feature keys configured for a single adapter type's settings.
*
* A key is a "feature" (e.g. `images`/`media`/`files` for storage) when it isn't
* `active` and its value either names another adapter (a String, e.g.
* `media: 'LocalMediaStorage'`) or carries inline feature config (an Object with
* an `adapter` property, e.g. `media: {adapter: 'S3Storage', bucket: '...'}`).
* Plain adapter-config objects keyed by class name (e.g. `LocalMediaStorage: {}`)
* are not features — `resolveAdapterOptions` resolves those back to the active
* adapter — so they're intentionally excluded here.
*/
export function getConfiguredFeatures(settings: unknown): string[] {
    if (!settings || typeof settings !== 'object') {
        return [];
    }

    return Object.entries(settings as Record<string, unknown>)
        .filter(([key, value]) => {
            if (key === 'active') {
                return false;
            }
            return typeof value === 'string'
                || (typeof value === 'object' && value !== null && 'adapter' in value);
        })
        .map(([key]) => key);
}

/**
* Resolve adapter options from the config, handling both top-level and nested feature-specific options.
*/
export function resolveAdapterOptions(name: string, config: any) {
    const [type, feature] = name.split(":");
    const settings = config[type]

    let adapterClassName: string;
    let adapterConfig: object;

    const featureAdapter = feature ? settings?.[feature] : undefined;
    if (typeof featureAdapter === 'string' && settings?.[featureAdapter]) {
        // CASE: load resource-specific adapter when there is an adapter feature
        //       name (String) specified as well as custom feature config
        adapterClassName = featureAdapter;
        adapterConfig = settings[featureAdapter];
    } else if (featureAdapter?.adapter) {
        // CASE: load resource-specific adapter when there is an adapter feature
        //       name (Object) specified as well as custom feature config
        adapterClassName = featureAdapter.adapter;
        const commonConfig = {...settings[adapterClassName]};
        const featureConfig = {...featureAdapter};
        delete featureConfig.adapter;
        adapterConfig = {...commonConfig, ...featureConfig};
    } else {
        adapterClassName = settings?.active;
        adapterConfig = settings?.[adapterClassName];
    }

    return {adapterClassName, adapterConfig};
}
