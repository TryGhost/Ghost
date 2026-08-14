/* eslint ghost/ghost-custom/no-native-error: off */

/**
 * Renderer backend for edit mode — a thin session wrapper around
 * `@tryghost/theme-renderer`'s `createRenderer`. One module, two runtimes:
 *
 * - the render worker entry (worker.js) drives it inside a module Worker;
 * - the chunk itself drives it on the main thread when worker construction
 *   or boot fails (CSP blocking blob workers, etc.) — the mandatory fallback.
 *
 * The renderer is rebuilt from scratch on every setTheme(): per
 * docs/markers.md, a fresh renderer per edit is the supported path
 * (engine.resetCache() does not re-register partials).
 *
 * This file is chunk-only — it must never be imported by anything the main
 * toolbar bundle reaches, or the whole renderer gets inlined into the IIFE.
 */
import {createRenderer} from '@tryghost/theme-renderer';

/** Trailing-slash 301s and in-site redirects are followed up to this depth. */
const MAX_INTERNAL_REDIRECTS = 3;

/**
 * @param {Object} options
 * @param {string} options.siteUrl — origin + subdir of the site, e.g. http://localhost:2368/
 * @param {string} options.contentApiKey
 * @param {Record<string, unknown>} [options.config] — instance config (assetHash, portal, sodoSearch)
 * @returns {{setTheme(theme: Record<string, string>): Promise<void>, render(url: string, options?: {markers?: boolean}): Promise<{status: number, html: string, url: string}>}}
 */
export function createRenderBackend({siteUrl, contentApiKey, config}) {
    let rendererPromise = null;

    async function setTheme(theme) {
        rendererPromise = createRenderer({siteUrl, contentApiKey, theme, config});
        await rendererPromise;
    }

    async function render(url, {markers = false} = {}) {
        if (!rendererPromise) {
            throw new Error('edit_mode_backend_no_theme');
        }

        const renderer = await rendererPromise;
        let currentUrl = url;

        for (let hop = 0; hop <= MAX_INTERNAL_REDIRECTS; hop += 1) {
            const response = await renderer.render(new Request(currentUrl), {markers});

            const location = response.headers.get('location');
            if (location && response.status >= 300 && response.status < 400) {
                // Follow same-site redirects (pretty-urls trailing slash,
                // page-1 aliases); anything pointing off-site is surfaced.
                const next = new URL(location, currentUrl);
                if (next.origin !== new URL(currentUrl).origin) {
                    throw new Error(`edit_mode_backend_external_redirect:${next.href}`);
                }
                currentUrl = next.href;
                continue;
            }

            const html = await response.text();
            return {status: response.status, html, url: currentUrl};
        }

        throw new Error('edit_mode_backend_redirect_loop');
    }

    return {setTheme, render};
}
