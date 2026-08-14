/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared harness for the live-instance integration suites: availability probe,
 * Casper theme loader, and rendered/live output capture. The probe runs once
 * per test file (vitest isolates files); tests `describe.skipIf` on
 * `unavailableReason` so CI without a running Ghost stays green.
 */
import {readFileSync, readdirSync, mkdirSync, writeFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

export const GHOST_URL = (process.env.GHOST_URL ?? 'http://localhost:2368').replace(/\/$/, '');
const CASPER_PATH = join(import.meta.dirname, '../../../../ghost/core/content/themes/casper');
const OUTPUT_DIR = join(import.meta.dirname, '__output__');

export interface LiveProbe {
    /** Non-empty when the suite should skip (message explains why) */
    unavailableReason: string;
    /** The live home HTML (probe fetch — reused for home comparisons) */
    liveHomeHtml: string;
    /** From GHOST_CONTENT_API_KEY or scraped from the portal script tag */
    contentApiKey: string;
}

export async function probeLive(): Promise<LiveProbe> {
    let liveHomeHtml = '';
    let contentApiKey = process.env.GHOST_CONTENT_API_KEY ?? '';
    let unavailableReason = '';

    try {
        const response = await fetch(`${GHOST_URL}/`, {signal: AbortSignal.timeout(3000)});
        if (response.ok) {
            liveHomeHtml = await response.text();
            if (!contentApiKey) {
                contentApiKey = liveHomeHtml.match(/data-key="([a-f0-9]+)"/)?.[1] ?? '';
            }
            if (!contentApiKey) {
                unavailableReason = `no Content API key: set GHOST_CONTENT_API_KEY (could not extract data-key from ${GHOST_URL})`;
            }
        } else {
            unavailableReason = `GET ${GHOST_URL}/ responded ${response.status}`;
        }
    } catch (err: any) {
        unavailableReason = `Ghost dev instance unreachable at ${GHOST_URL} (${err?.cause?.code ?? err?.message}) — start it (ghost/core: pnpm dev) or set GHOST_URL`;
    }

    return {unavailableReason, liveHomeHtml, contentApiKey};
}

export interface InstanceConfigScrape {
    /** Per-boot asset hash from any `?v=<hash>` on a built asset URL */
    assetHash?: string;
    /** Portal script URL (data-i18n is portal-specific — see getMembersHelper) */
    portalUrl?: string;
    /** Sodo-search script URL + styles (data-sodo-search is search-specific) */
    sodoSearch?: {url: string; styles: string};
    /** Names of scrapes that found nothing — non-empty means degraded config */
    missing: string[];
    /** Ready-to-pass `createRenderer({config})` shape for whatever was found */
    config: Record<string, unknown>;
}

/**
 * Instance config the Content API cannot supply (docs/deltas.md rows 1 + 3),
 * scraped from the live home HTML. Shared by the byte-parity suite
 * (parity.test.ts) and the fixture recorder (record-browser-fixtures.ts) so
 * the two can never drift apart on what "fully configured" means.
 */
export function scrapeInstanceConfig(liveHomeHtml: string): InstanceConfigScrape {
    const assetHash = liveHomeHtml.match(/\?v=([a-f0-9]+)"/)?.[1];
    const portalUrl = liveHomeHtml.match(/<script defer src="([^"]+)" data-i18n=/)?.[1];
    const sodoSearchMatch = liveHomeHtml.match(/<script defer src="([^"]+)" data-key="[^"]*" data-styles="([^"]*)" data-sodo-search=/);
    const sodoSearch = sodoSearchMatch ? {url: sodoSearchMatch[1]!, styles: sodoSearchMatch[2]!} : undefined;

    const missing: string[] = [];
    if (!assetHash) {
        missing.push('assetHash (?v= on a built asset URL)');
    }
    if (!portalUrl) {
        missing.push('portal script tag');
    }
    if (!sodoSearch) {
        missing.push('sodo-search script tag');
    }

    return {
        assetHash,
        portalUrl,
        sodoSearch,
        missing,
        config: {
            // deltas.md #1 — the live per-boot hash (upstream: config assetHash
            // wins over the boot-time md5 in getGlobalAssetHash)
            ...(assetHash && {assetHash}),
            // deltas.md #3 — frontend-app instance config (Ghost server
            // config keys, extraction-map §6)
            ...(portalUrl && {portal: {url: portalUrl}}),
            ...(sodoSearch && {sodoSearch})
        }
    };
}

/** First post of the live instance (slug + absolute url), or null if none. */
export async function fetchFirstPost(contentApiKey: string): Promise<{slug: string; url: string} | null> {
    const response = await fetch(`${GHOST_URL}/ghost/api/content/posts/?key=${contentApiKey}&limit=1&fields=slug,url`);
    const {posts} = await response.json() as {posts?: Array<{slug: string; url: string}>};
    return posts?.[0] ?? null;
}

export function loadCasperTheme(): Record<string, string> {
    const files: Record<string, string> = {};
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            if (name === 'node_modules' || name === 'assets' || name.startsWith('.')) {
                continue;
            }
            const full = join(dir, name);
            if (statSync(full).isDirectory()) {
                walk(full);
            } else if (/\.(hbs|json)$/.test(name)) {
                files[relative(CASPER_PATH, full)] = readFileSync(full, 'utf8');
            }
        }
    };
    walk(CASPER_PATH);
    return files;
}

export function writeOutput(name: string, rendered: string, live: string): void {
    mkdirSync(OUTPUT_DIR, {recursive: true});
    writeFileSync(join(OUTPUT_DIR, `${name}.rendered.html`), rendered);
    writeFileSync(join(OUTPUT_DIR, `${name}.live.html`), live);
}
