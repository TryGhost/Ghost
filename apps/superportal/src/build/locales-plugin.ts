/**
 * Vite plugin: locale JSON merge pipeline for superportal.
 *
 * Build time: emits one `dist/portal/locales/{locale}.json` per Ghost-supported locale.
 * Dev time:   serves GET /locales/{locale}.json via Vite middleware.
 *
 * Merge order (later wins on duplicate keys):
 *   search < signup-form < portal
 *
 * Files that don't exist for a given locale are skipped gracefully.
 */

import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createRequire} from 'node:module';
import type {Plugin, ViteDevServer} from 'vite';

const _require = createRequire(import.meta.url);
const {SUPPORTED_LOCALES} = _require('@tryghost/i18n') as {SUPPORTED_LOCALES: string[]};

/** Namespaces merged in ascending priority order (last wins on key conflicts). */
const NAMESPACES = ['search', 'signup-form', 'portal'] as const;

const I18N_LOCALES_DIR = resolve(__dirname, '../../../../ghost/i18n/locales');

type StringMap = Record<string, string>;

/**
 * Read a JSON namespace file for a given locale.
 * Returns an empty object if the file does not exist.
 */
async function readNamespace(locale: string, ns: string): Promise<StringMap> {
    const filePath = join(I18N_LOCALES_DIR, locale, `${ns}.json`);
    if (!existsSync(filePath)) {
        return {};
    }
    try {
        const raw = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        // Filter to string values only; skip empty-string placeholders for untranslated keys.
        const result: StringMap = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'string' && value !== '') {
                result[key] = value;
            }
        }
        return result;
    } catch {
        console.warn(`[superportal/locales-plugin] failed to read ${filePath}, skipping`);
        return {};
    }
}

/**
 * Build the merged string map for a single locale.
 * Later namespaces in NAMESPACES override earlier ones on key conflicts.
 */
async function buildLocale(locale: string): Promise<StringMap> {
    const maps = await Promise.all(NAMESPACES.map(ns => readNamespace(locale, ns)));
    return Object.assign({}, ...maps) as StringMap;
}

/**
 * Cache: locale code -> merged JSON string. Populated once at plugin start
 * (dev) or per locale during generateBundle (build). We reuse across requests
 * in dev so the file system is only hit once per server restart.
 */
const cache = new Map<string, string>();

async function getLocaleJson(locale: string): Promise<string | null> {
    if (cache.has(locale)) {
        return cache.get(locale)!;
    }
    const strings = await buildLocale(locale);
    const json = JSON.stringify(strings, null, 2);
    cache.set(locale, json);
    return json;
}

export function localesPlugin(): Plugin {
    return {
        name: 'superportal-locales',

        // Dev-time: serve /locales/{locale}.json via middleware.
        configureServer(server: ViteDevServer) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url ?? '';
                const match = /^\/locales\/([^/]+)\.json(\?.*)?$/.exec(url);
                if (!match) {
                    next();
                    return;
                }

                const locale = match[1] as string;
                if (!SUPPORTED_LOCALES.includes(locale)) {
                    res.writeHead(404, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({error: `Unknown locale: ${locale}`}));
                    return;
                }

                const json = await getLocaleJson(locale);
                if (json === null) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({error: 'Failed to build locale'}));
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store'
                });
                res.end(json);
            });
        },

        // Build-time: emit one file per locale.
        async generateBundle() {
            for (const locale of SUPPORTED_LOCALES) {
                const json = await getLocaleJson(locale);
                if (json === null) {
                    continue;
                }
                this.emitFile({
                    type: 'asset',
                    fileName: `locales/${locale}.json`,
                    source: json
                });
            }
        }
    };
}
