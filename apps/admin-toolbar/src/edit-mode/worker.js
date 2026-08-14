/**
 * Render-worker entry — the THIRD build artifact
 * (umd/admin-toolbar-editor-worker.min.js, built by vite.worker.config.mjs as
 * a plain ES module beside the main bundle and the edit-mode chunk).
 *
 * The chunk boots it via a blob-bootstrap module worker (see
 * render-client.js: `new Worker(blobUrl, {type: 'module'})` where the blob is
 * a one-line `import "<this file's URL>"` — required because the artifact is
 * served cross-origin from the CDN and `new Worker(url)` is same-origin-only).
 *
 * Protocol (mirrors packages/theme-renderer/test/browser/render-worker.ts,
 * adapted to a persistent per-session backend):
 *   in : {id, type: 'init',      payload: {siteUrl, contentApiKey, config, theme}}
 *   in : {id, type: 'set-theme', payload: {theme}}
 *   in : {id, type: 'render',    payload: {url, markers}}
 *   out: {id, ok: true, result} | {id, ok: false, error}
 */
import {createRenderBackend} from './render-backend.js';

let backend = null;

self.onmessage = async (event) => {
    const {id, type, payload} = event.data || {};

    try {
        let result = null;

        if (type === 'init') {
            backend = createRenderBackend({
                siteUrl: payload.siteUrl,
                contentApiKey: payload.contentApiKey,
                config: payload.config
            });
            await backend.setTheme(payload.theme);
        } else if (type === 'set-theme') {
            await backend.setTheme(payload.theme);
        } else if (type === 'render') {
            result = await backend.render(payload.url, {markers: payload.markers});
        } else {
            throw new Error(`edit_mode_worker_unknown_message:${type}`);
        }

        self.postMessage({id, ok: true, result});
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error instanceof Error ? (error.message || String(error)) : String(error)
        });
    }
};
