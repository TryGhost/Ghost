import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import type {AdapterConstructor} from "./types";
import type {ConfigInstance} from '../../../shared/config/loader';

/**
* Whether `filePath` resolves to a location inside `directory`.
*
* Both sides are resolved through `fs.realpathSync` before comparing, because
* Node's module resolution returns realpaths — so a symlinked install (or macOS'
* `/var` -> `/private/var`) would otherwise look like an escape.
*/
function isContainedBy(filePath: string, directory: string): boolean {
    let realFilePath: string;
    let realDirectory: string;

    try {
        realFilePath = fs.realpathSync(filePath);
        realDirectory = fs.realpathSync(directory);
    } catch {
        return false;
    }

    const relative = path.relative(realDirectory, realFilePath);

    // Compare the first segment exactly rather than using startsWith('..'), so
    // a legitimately-contained entry whose name merely begins with dots (e.g.
    // "..hidden.js") isn't mistaken for traversal.
    const [firstSegment] = relative.split(path.sep);

    return relative !== '' && firstSegment !== '..' && !path.isAbsolute(relative);
}

/**
* Map a candidate adapter path to the module Node should actually load.
*
* An adapter installed into `content/adapters` can be a full module directory
* with its own `package.json`. Node's CommonJS directory resolution honours
* `main` but ignores `exports` — per spec, `exports` applies only to package
* specifiers resolved through `node_modules`, never to directory paths — so a
* package declaring only `exports` would otherwise fail to resolve.
*
* We get native `exports` resolution by self-referencing: because the referrer
* we hand to `createRequire` sits inside the package, requiring the package by
* its own `name` makes Node resolve through that package's own `exports` field,
* applying conditions, nesting and subpath rules for us.
*
* Anything that isn't a self-referencing module directory — a bare
* `node_modules` specifier, a plain `index.js` adapter directory, or a package
* declaring only `main` — is returned untouched so Node's own resolution
* applies, preserving the behaviour of pre-existing adapters.
*
* @NOTE: `require` matches the `require`, `node` and `default` conditions but
* never `import`, and that isn't overridable (`--conditions` only adds custom
* conditions). So an ESM-only package whose root export is conditioned solely on
* `import` (`{".": {"import": "./dist/index.js"}}`) is not resolvable here, even
* though `require()` would happily load the file it points at. Such a package
* needs a `require`, `node`, `default` or unconditioned target. Lifting this
* would mean reading the `exports` field ourselves.
*/
export function resolveAdapterEntryPoint(pathToAdapter: string): string {
    // The node_modules lane passes a bare specifier rather than a path — Node
    // already applies `exports` to those — and a relative read here would be
    // resolved against the cwd, so only absolute directories are considered.
    if (!path.isAbsolute(pathToAdapter)) {
        return pathToAdapter;
    }

    const manifestPath = path.join(pathToAdapter, 'package.json');

    let name: unknown;
    try {
        ({name} = JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    } catch {
        // Not a module directory, or an unreadable/malformed manifest.
        return pathToAdapter;
    }

    // Self-referencing requires a package name to reference.
    if (typeof name !== 'string' || !name) {
        return pathToAdapter;
    }

    try {
        const resolved = createRequire(manifestPath).resolve(name);

        // Self-referencing only kicks in when the package declares `exports`.
        // Without it, Node falls back to walking `node_modules` up the tree and
        // can resolve a *different*, same-named package from elsewhere in the
        // install — silently loading an impostor instead of the operator's
        // adapter. Only accept a result that actually lives in the adapter
        // directory; anything else falls back to Node's directory resolution.
        if (!isContainedBy(resolved, pathToAdapter)) {
            return pathToAdapter;
        }

        return resolved;
    } catch {
        // No usable `exports` entry — fall back to Node's directory resolution,
        // which still handles `main` and `index.js`.
        return pathToAdapter;
    }
}

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

function normalizeAdapterPaths(config: ConfigInstance, key: 'redirects' | 'route-settings', defaultPathsByAdapter: Record<string, Record<string, string>>) {
    const adapterConfig = config.get(`adapters:${key}`);
    if (!adapterConfig) {
        return adapterConfig;
    }

    const normalized = {...adapterConfig};
    for (const [adapterClassName, defaultPaths] of Object.entries(defaultPathsByAdapter)) {
        if (!normalized[adapterClassName]) {
            continue;
        }

        const storeConfig = {...normalized[adapterClassName]};
        for (const [pathName, defaultPath] of Object.entries(defaultPaths)) {
            storeConfig[pathName] ||= defaultPath;
        }
        normalized[adapterClassName] = storeConfig;
    }

    return normalized;
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
        redirects: normalizeAdapterPaths(config, 'redirects', {
            FileStore: {
                basePath: config.getContentPath('data')
            }
        }),
        'route-settings': normalizeAdapterPaths(config, 'route-settings', {
            FileStore: {
                basePath: config.getContentPath('settings'),
                defaultSettingsBasePath: config.get('paths:defaultRouteSettings')
            },
            // The S3 store reads the bundled defaults off disk too, for the
            // empty-state response when the bucket holds no routes.yaml yet.
            S3RouteSettingsStore: {
                defaultSettingsBasePath: config.get('paths:defaultRouteSettings')
            }
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
