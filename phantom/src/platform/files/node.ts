import {promises as fs} from 'node:fs';
import path from 'node:path';
import {normalizeKey, type FileStore} from './store.js';

export type NodeFileStoreOptions = {
    // Where local theme assets live (config.themes.fs.root); monorepo
    // fallbacks are tried after it.
    themesRoot?: string;
};

// Maps logical asset keys to monorepo filesystem candidates, tried in order.
// The first prefix match wins; within it the first readable file wins. The
// staging tool (src/tools/stage-worker-assets.ts) mirrors this same layout
// into a flat directory for the Workers static-assets binding.
const candidatesFor = (key: string, themesRoot: string): string[] => {
    const cwd = process.cwd();
    const segments = key.split('/');

    if (key.startsWith('admin/')) {
        const rest = key.slice('admin/'.length);
        return [
            path.join(cwd, 'content', 'admin', rest),
            path.join(cwd, '..', 'ghost', 'core', 'core', 'built', 'admin', rest)
        ];
    }
    if (key.startsWith('apps/') && segments.length >= 3) {
        const [, appName, ...rest] = segments;
        if (appName && /^[a-z0-9-]+$/.test(appName)) {
            return [path.join(cwd, '..', 'apps', appName, 'dist', ...rest)];
        }
        return [];
    }
    if (key.startsWith('public/')) {
        return [path.join(cwd, '..', 'ghost', 'core', 'content', 'public', key.slice('public/'.length))];
    }
    if (key.startsWith('portal/')) {
        return [path.join(cwd, '..', 'apps', 'portal', 'umd', key.slice('portal/'.length))];
    }
    if (key.startsWith('sodo-search/')) {
        return [path.join(cwd, '..', 'apps', 'sodo-search', 'umd', key.slice('sodo-search/'.length))];
    }
    if (key.startsWith('announcement-bar/')) {
        return [path.join(cwd, '..', 'apps', 'announcement-bar', 'umd', key.slice('announcement-bar/'.length))];
    }
    if (key === 'attribution/member-attribution.js') {
        return [path.join(cwd, '..', 'ghost', 'core', 'core', 'frontend', 'src', 'member-attribution', 'member-attribution.js')];
    }
    if (key === 'attribution/url-attribution.js') {
        return [path.join(cwd, '..', 'ghost', 'core', 'core', 'frontend', 'src', 'utils', 'url-attribution.js')];
    }
    if (key.startsWith('themes/') && segments.length >= 4 && segments[2] === 'assets') {
        const themeId = segments[1]!;
        const rest = segments.slice(3);
        return [
            path.resolve(themesRoot, themeId, 'assets', ...rest),
            path.join(cwd, '..', 'ghost', 'core', 'content', 'themes', themeId, 'assets', ...rest),
            path.join(cwd, '..', 'ghost', 'core', 'test', 'utils', 'fixtures', 'themes', themeId, 'assets', ...rest)
        ];
    }
    return [];
};

export const createNodeFileStore = (options: NodeFileStoreOptions = {}): FileStore => {
    const themesRoot = options.themesRoot ?? './content/themes';
    const read = async (rawKey: string) => {
        const key = normalizeKey(rawKey);
        if (!key) {
            return null;
        }
        for (const candidate of candidatesFor(key, themesRoot)) {
            try {
                return new Uint8Array(await fs.readFile(candidate));
            } catch {
                continue;
            }
        }
        return null;
    };

    const readText = async (rawKey: string) => {
        const body = await read(rawKey);
        return body ? new TextDecoder().decode(body) : null;
    };

    return {read, readText};
};
