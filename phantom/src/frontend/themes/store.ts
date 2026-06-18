import type {AppConfig} from '../../platform/config/config.js';
import type {SettingsService} from '../../modules/settings/service.js';
import type {FileStore} from '../../platform/files/store.js';
import type {ThemeBundle} from './types.js';
import type {ThemeBundleProvider} from './bundles.js';

type CacheEntry = {
    themeId: string;
    bundle: ThemeBundle;
    loadedAt: number;
};

type ThemeStore = {
    getActiveBundle: () => Promise<ThemeBundle>;
    getActiveThemeId: () => Promise<string>;
    getAsset: (assetPath: string) => Promise<{body: Uint8Array; contentType: string} | null>;
};

const CACHE_TTL_MS = 30_000;

const resolveTemplate = (template: string, values: Record<string, string>) => {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
};

const readSetting = (settings: Awaited<ReturnType<SettingsService['listSettings']>>['settings'], key: string) => {
    return settings.find((setting) => setting.key === key)?.value;
};

const mimeTypes: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const getContentType = (assetPath: string) => {
    const dotIndex = assetPath.lastIndexOf('.');
    const extension = dotIndex === -1 ? '' : assetPath.slice(dotIndex).toLowerCase();
    return mimeTypes[extension] ?? 'application/octet-stream';
};

export const createThemeStore = ({
    config,
    settingsService,
    bundles,
    fileStore
}: {
    config: AppConfig;
    settingsService: SettingsService;
    bundles: ThemeBundleProvider;
    fileStore: FileStore;
}): ThemeStore => {
    let cache: CacheEntry | null = null;

    const getActiveThemeId = async () => {
        const settings = await settingsService.listSettings();
        const value = readSetting(settings.settings, 'theme.active');
        // The configured active theme always wins; bundled defaults are
        // fallbacks for sites that have not picked a theme yet.
        const candidates = [
            typeof value === 'string' && value.trim().length > 0 ? value : null,
            'casper',
            'source'
        ].filter((entry): entry is string => Boolean(entry));

        for (const candidate of candidates) {
            if (await bundles.has(candidate)) {
                return candidate;
            }
        }

        return candidates[0] ?? 'casper';
    };

    const getActiveBundle = async () => {
        const themeId = await getActiveThemeId();
        const now = Date.now();
        if (cache && cache.themeId === themeId && now - cache.loadedAt < CACHE_TTL_MS) {
            return cache.bundle;
        }

        const bundle = await bundles.load(themeId);
        cache = {themeId, bundle, loadedAt: now};
        return bundle;
    };

    const getAsset = async (assetPath: string) => {
        const themeId = await getActiveThemeId();
        if (config.themes.provider === 'r2') {
            if (!config.themes.r2.baseUrl) {
                throw new Error('Theme R2 base URL is required');
            }
            const assetKey = resolveTemplate(config.themes.r2.assetPath, {themeId, path: assetPath});
            const url = `${config.themes.r2.baseUrl.replace(/\/$/, '')}/${assetKey.replace(/^\//, '')}`;
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const body = new Uint8Array(await response.arrayBuffer());
            return {body, contentType: getContentType(assetPath)};
        }

        const body = await fileStore.read(`themes/${themeId}/assets/${assetPath}`);
        if (!body) {
            return null;
        }
        return {body, contentType: getContentType(assetPath)};
    };

    return {getActiveBundle, getActiveThemeId, getAsset};
};
