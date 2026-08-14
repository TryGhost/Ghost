/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode UI bar, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * Renderer backend for edit mode — a thin session wrapper around
 * `@tryghost/theme-renderer`'s `createRenderer`. One module, two runtimes:
 *
 * - the render worker entry (worker.js) drives it inside a module Worker;
 * - the chunk drives it on the main thread when worker construction or boot
 *   fails, by dynamically importing the worker ARTIFACT (which re-exports
 *   this factory) — the mandatory fallback, see render-client.js.
 *
 * The renderer is rebuilt from scratch on every setTheme(): per
 * docs/markers.md, a fresh renderer per edit is the supported path
 * (engine.resetCache() does not re-register partials). A failed setTheme
 * keeps the LAST GOOD renderer: the rejected attempt is never cached, so
 * subsequent renders are not poisoned by one bad theme (the session reverts
 * to the previous theme on edit failure and must be able to keep rendering).
 *
 * This file is worker-artifact-only — it must never be imported by the chunk
 * or the main toolbar bundle, or the whole renderer gets inlined into them.
 */
import {createRenderer} from '@tryghost/theme-renderer';

/** Trailing-slash 301s and in-site redirects are followed up to this depth. */
const MAX_INTERNAL_REDIRECTS = 3;

/**
 * @param {Object} options
 * @param {string} options.siteUrl — origin + subdir of the site, e.g. http://localhost:2368/
 * @param {string} options.contentApiKey
 * @param {Record<string, unknown>} [options.config] — instance config (assetHash, portal, sodoSearch)
 * @param {typeof createRenderer} [options.rendererFactory] — test seam
 * @returns {{setTheme(theme: Record<string, string>): Promise<void>, render(url: string, options?: {markers?: boolean}): Promise<{status: number, html: string, url: string}>}}
 */
export function createRenderBackend({siteUrl, contentApiKey, config, rendererFactory = createRenderer}) {
    let rendererPromise = null;

    async function setTheme(theme) {
        // Await the new renderer BEFORE swapping it in: a rejected attempt
        // must never become the cached rendererPromise, or every later
        // render would re-reject with the same stale error.
        const attempt = rendererFactory({siteUrl, contentApiKey, theme, config});
        await attempt;
        rendererPromise = attempt;
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
