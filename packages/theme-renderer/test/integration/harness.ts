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
