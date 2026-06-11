import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import Handlebars from 'handlebars';
import type {AppConfig} from '../../platform/config/config.js';
import type {ThemeBundle} from './types.js';
import type {ThemeBundleProvider} from './bundles.js';

const TEMPLATE_EXTENSION = '.hbs';
type TemplateSpec = Parameters<typeof Handlebars.template>[0];

const toPosixPath = (value: string) => value.split(path.sep).join('/');

const resolveTemplate = (template: string, values: Record<string, string>) => {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
};

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

// Monorepo theme-source fallbacks for development: themes that haven't been
// precompiled to bundle.mjs are compiled from their .hbs source on demand.
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

export const createNodeThemeBundles = (config: AppConfig): ThemeBundleProvider => {
    const has = async (themeId: string) => {
        if (config.themes.provider === 'r2') {
            return true;
        }
        const bundlePath = path.resolve(config.themes.fs.root, themeId, 'bundle.mjs');
        try {
            await fs.access(bundlePath);
            return true;
        } catch {
            try {
                await getFallbackRoot(themeId);
                return true;
            } catch {
                return false;
            }
        }
    };

    const load = async (themeId: string) => {
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

    return {has, load};
};
