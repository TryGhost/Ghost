import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import Handlebars from 'handlebars';
import type {AppConfig} from '../../platform/config/config.js';
import type {SettingsService} from '../../modules/settings/service.js';
import type {ThemeBundle} from './types.js';

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

const TEMPLATE_EXTENSION = '.hbs';
type TemplateSpec = Parameters<typeof Handlebars.template>[0];

const toPosixPath = (value: string) => value.split(path.sep).join('/');

const walkFiles = async (root: string): Promise<string[]> => {
    const entries = await fs.readdir(root, {withFileTypes: true});
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walkFiles(entryPath));
            continue;
        }
        files.push(entryPath);
    }

    return files;
};

const buildBundleFromSource = async (themeRoot: string, themeId: string): Promise<ThemeBundle> => {
    const files = await walkFiles(themeRoot);
    const templateFiles = files.filter((file) => path.extname(file) === TEMPLATE_EXTENSION);
    const templates: Record<string, ReturnType<typeof Handlebars.template>> = {};
    const partials: Record<string, ReturnType<typeof Handlebars.template>> = {};
    const layouts: Record<string, string | null> = {};

    for (const filePath of templateFiles) {
        const relativePath = path.relative(themeRoot, filePath);
        const source = await fs.readFile(filePath, 'utf8');
        const layoutMatch = source.match(/\{\{!<\s*([^}\s]+)\s*\}\}/);
        const layout = layoutMatch?.[1] ?? null;
        const precompiled = Handlebars.precompile(source, {preventIndent: true}) as unknown as string;
        const spec = new Function(`return ${precompiled}`)() as TemplateSpec;
        const compiled = Handlebars.template(spec);

        if (relativePath.startsWith(`partials${path.sep}`)) {
            const partialName = toPosixPath(relativePath.replace(/^partials[\/]/, '').replace(TEMPLATE_EXTENSION, ''));
            partials[partialName] = compiled;
            continue;
        }

        const templateName = path.basename(relativePath, TEMPLATE_EXTENSION);
        templates[templateName] = compiled;
        layouts[templateName] = layout;
    }

    const templateNames = Object.keys(templates).sort();
    const partialNames = Object.keys(partials).sort();

    return {
        templates,
        partials,
        theme: {
            name: themeId,
            version: null,
            config: {},
            templates: templateNames,
            customTemplates: templateNames.filter((name) => name.startsWith('custom-')),
            partials: partialNames,
            layouts
        }
    };
};

const importBundleFromSource = async (source: string) => {
    const base64 = Buffer.from(source, 'utf8').toString('base64');
    const moduleUrl = `data:text/javascript;base64,${base64}`;
    const module = await import(moduleUrl);
    return (module.default ?? module) as ThemeBundle;
};

const importBundleFromFile = async (filePath: string) => {
    const moduleUrl = pathToFileURL(filePath).href;
    const module = await import(moduleUrl);
    return (module.default ?? module) as ThemeBundle;
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
    const extension = path.extname(assetPath).toLowerCase();
    return mimeTypes[extension] ?? 'application/octet-stream';
};

export const createThemeStore = ({
    config,
    settingsService
}: {
    config: AppConfig;
    settingsService: SettingsService;
}): ThemeStore => {
    let cache: CacheEntry | null = null;

    const resolveLocalThemeId = async (themeId: string) => {
        const bundlePath = path.resolve(config.themes.fs.root, themeId, 'bundle.mjs');
        try {
            await fs.access(bundlePath);
            return themeId;
        } catch {
            try {
                await getFallbackRoot(themeId);
                return themeId;
            } catch {
                return null;
            }
        }
    };

    const getActiveThemeId = async () => {
        if (config.themes.provider !== 'fs') {
            const settings = await settingsService.listSettings();
            const value = readSetting(settings.settings, 'theme.active');
            return typeof value === 'string' && value.trim().length > 0 ? value : 'casper';
        }

        const preferred = ['casper', 'source'];
        const settings = await settingsService.listSettings();
        const value = readSetting(settings.settings, 'theme.active');
        const candidates = [
            ...preferred,
            typeof value === 'string' && value.trim().length > 0 ? value : null
        ].filter((entry): entry is string => Boolean(entry));

        for (const candidate of candidates) {
            const resolved = await resolveLocalThemeId(candidate);
            if (resolved) {
                return resolved;
            }
        }

        return candidates[0] ?? 'casper';
    };

    const getFallbackRoot = async (themeId: string) => {
        const roots = [
            path.resolve(process.cwd(), '..', 'ghost', 'core', 'content', 'themes', themeId),
            path.resolve(process.cwd(), '..', 'ghost', 'core', 'test', 'utils', 'fixtures', 'themes', themeId)
        ];

        for (const root of roots) {
            try {
                await fs.access(root);
                return root;
            } catch {
                continue;
            }
        }

        throw new Error(`Theme assets not found for ${themeId}`);
    };

    const loadBundle = async (themeId: string) => {
        if (config.themes.provider === 'r2') {
            if (!config.themes.r2.baseUrl) {
                throw new Error('Theme R2 base URL is required');
            }
            const bundlePath = resolveTemplate(config.themes.r2.bundlePath, {themeId});
            const url = `${config.themes.r2.baseUrl.replace(/\/$/, '')}/${bundlePath.replace(/^\//, '')}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch theme bundle: ${response.status}`);
            }
            const source = await response.text();
            return importBundleFromSource(source);
        }

        const bundlePath = path.resolve(config.themes.fs.root, themeId, 'bundle.mjs');
        try {
            await fs.access(bundlePath);
            return importBundleFromFile(bundlePath);
        } catch {
            const fallbackRoot = await getFallbackRoot(themeId);
            return buildBundleFromSource(fallbackRoot, themeId);
        }
    };

    const getActiveBundle = async () => {
        const themeId = await getActiveThemeId();
        const now = Date.now();
        if (cache && cache.themeId === themeId && now - cache.loadedAt < CACHE_TTL_MS) {
            return cache.bundle;
        }

        const bundle = await loadBundle(themeId);
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

        const localPath = path.resolve(config.themes.fs.root, themeId, 'assets', assetPath);
        try {
            const body = await fs.readFile(localPath);
            return {body, contentType: getContentType(assetPath)};
        } catch {
            try {
                const fallbackRoot = await getFallbackRoot(themeId);
                const fallbackPath = path.resolve(fallbackRoot, 'assets', assetPath);
                const body = await fs.readFile(fallbackPath);
                return {body, contentType: getContentType(assetPath)};
            } catch {
                return null;
            }
        }
    };

    return {getActiveBundle, getActiveThemeId, getAsset};
};
