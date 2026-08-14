/* eslint ghost/ghost-custom/no-native-error: off */

/**
 * Render client — owns WHERE the renderer runs.
 *
 * Preferred path: a module Web Worker running the worker artifact
 * (admin-toolbar-editor-worker.min.js, resolved relative to the toolbar
 * script's own URL exactly like the chunk itself is). The artifact lives on
 * the CDN, and `new Worker(crossOriginUrl)` is same-origin-only, so the
 * worker is booted through a blob bootstrap: a same-origin blob module whose
 * body is just `import "<worker artifact URL>"` (module imports inside
 * workers may be cross-origin, subject to CORS — which the CDN serves).
 *
 * Mandatory fallback: if worker construction, boot, or init fails for any
 * reason (CSP forbidding blob: workers or workers entirely, CDN hiccup), the
 * same backend module runs on the main thread — it is Request → Response all
 * the way down, so the only cost is main-thread render time.
 */
import {createRenderBackend} from './render-backend.js';

export const EDITOR_WORKER_FILENAME = 'admin-toolbar-editor-worker.min.js';

/** Cold boot compiles the whole renderer bundle inside the worker. */
const WORKER_BOOT_TIMEOUT_MS = 30000;
const WORKER_CALL_TIMEOUT_MS = 30000;

export function resolveWorkerUrl(scriptUrl) {
    return new URL(EDITOR_WORKER_FILENAME, scriptUrl).href;
}

function createBlobBootstrapWorker(workerUrl) {
    if (typeof Worker !== 'function') {
        throw new Error('edit_mode_no_worker_support');
    }

    const blob = new Blob([`import ${JSON.stringify(workerUrl)};`], {type: 'text/javascript'});
    const blobUrl = URL.createObjectURL(blob);

    try {
        const worker = new Worker(blobUrl, {type: 'module'});
        return {worker, blobUrl};
    } catch (error) {
        URL.revokeObjectURL(blobUrl);
        throw error;
    }
}

function createWorkerRpc(worker) {
    let nextId = 0;
    const pending = new Map();

    function failAll(error) {
        for (const entry of pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(error);
        }
        pending.clear();
    }

    worker.onmessage = (event) => {
        const {id, ok, result, error} = event.data || {};
        const entry = pending.get(id);

        if (!entry) {
            return;
        }

        pending.delete(id);
        clearTimeout(entry.timer);

        if (ok) {
            entry.resolve(result);
        } else {
            entry.reject(new Error(error || 'edit_mode_worker_error'));
        }
    };

    // A bundling/boot failure surfaces as a worker-level error event rather
    // than a posted message (same failure mode the theme-renderer browser
    // suite guards) — every in-flight call rejects, which fails init and
    // triggers the main-thread fallback.
    worker.onerror = (event) => {
        failAll(new Error(`edit_mode_worker_crashed:${event.message || 'unknown'}`));
    };

    return {
        call(type, payload, timeoutMs = WORKER_CALL_TIMEOUT_MS) {
            nextId += 1;
            const id = nextId;

            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error(`edit_mode_worker_timeout:${type}`));
                }, timeoutMs);

                pending.set(id, {resolve, reject, timer});
                worker.postMessage({id, type, payload});
            });
        },
        destroy() {
            failAll(new Error('edit_mode_worker_destroyed'));
            worker.terminate();
        }
    };
}

/**
 * Boots the renderer, worker-first with main-thread fallback.
 *
 * @param {Object} options
 * @param {string} options.siteUrl
 * @param {string} options.contentApiKey
 * @param {Record<string, unknown>} [options.config]
 * @param {Record<string, string>} options.theme
 * @param {string} options.workerUrl — resolved worker artifact URL ('' disables the worker path)
 * @param {(url: string) => {worker: Worker, blobUrl: string}} [options.workerFactory] — test seam
 * @param {typeof createRenderBackend} [options.backendFactory] — test seam
 * @returns {Promise<{mode: 'worker'|'main', render(url: string, options?: {markers?: boolean}): Promise<{status: number, html: string, url: string}>, setTheme(theme: Record<string, string>): Promise<void>, destroy(): void}>}
 */
export async function startRenderClient({
    siteUrl,
    contentApiKey,
    config,
    theme,
    workerUrl,
    workerFactory = createBlobBootstrapWorker,
    backendFactory = createRenderBackend
}) {
    if (workerUrl) {
        let blobUrl = null;
        let rpc = null;

        try {
            const created = workerFactory(workerUrl);
            blobUrl = created.blobUrl ?? null;
            rpc = createWorkerRpc(created.worker);

            await rpc.call('init', {siteUrl, contentApiKey, config, theme}, WORKER_BOOT_TIMEOUT_MS);

            return {
                mode: 'worker',
                render(url, options = {}) {
                    return rpc.call('render', {url, markers: options.markers});
                },
                setTheme(nextTheme) {
                    return rpc.call('set-theme', {theme: nextTheme});
                },
                destroy() {
                    rpc.destroy();
                    if (blobUrl) {
                        URL.revokeObjectURL(blobUrl);
                    }
                }
            };
        } catch {
            // Fall through to the main-thread backend below.
            if (rpc) {
                rpc.destroy();
            }
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }

    const backend = backendFactory({siteUrl, contentApiKey, config});
    await backend.setTheme(theme);

    return {
        mode: 'main',
        render(url, options = {}) {
            return backend.render(url, options);
        },
        setTheme(nextTheme) {
            return backend.setTheme(nextTheme);
        },
        destroy() {}
    };
}
