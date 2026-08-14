/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode UI bar, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

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
 * Mandatory fallback: if worker construction or boot fails (CSP forbidding
 * blob: workers or workers entirely, CDN hiccup), the client dynamically
 * `import()`s the SAME worker artifact URL — it is a dual-purpose module that
 * re-exports createRenderBackend and only installs its message loop inside a
 * worker scope — and runs the backend on the main thread. One renderer copy
 * in the build; the import is usually an HTTP-cache hit. This module must
 * never import render-backend.js statically, or the renderer gets bundled
 * into the chunk (the size guard in the test suite would trip).
 *
 * Post-init crash recovery: if the booted worker later crashes
 * (onerror/onmessageerror) or a call times out, the client terminates the
 * worker, switches PERMANENTLY to the main-thread backend, replays the
 * current theme, and retries the failed call once. Renderer-level errors
 * (ok: false replies — e.g. a broken template) do NOT trigger the failover;
 * only worker-transport failures do.
 */

export const EDITOR_WORKER_FILENAME = 'admin-toolbar-editor-worker.min.js';

/** Cold boot compiles the whole renderer bundle inside the worker. */
const WORKER_BOOT_TIMEOUT_MS = 30000;
/** Per-call budget once booted — a healthy render takes well under a second. */
const WORKER_CALL_TIMEOUT_MS = 10000;

export function resolveWorkerUrl(scriptUrl) {
    return new URL(EDITOR_WORKER_FILENAME, scriptUrl).href;
}

/**
 * Worker-transport failures (crash, timeout, teardown) are marked so the
 * failover path can tell them apart from renderer-level errors relayed
 * through an ok:false reply.
 */
function workerFailure(message) {
    const error = new Error(message);
    error.workerFailure = true;
    return error;
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

function createWorkerRpc(worker, callTimeoutMs) {
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
    // suite guards) — every in-flight call rejects with a transport-marked
    // error, which fails init (→ main-thread boot) or, post-init, triggers
    // the permanent main-thread failover.
    worker.onerror = (event) => {
        failAll(workerFailure(`edit_mode_worker_crashed:${event.message || 'unknown'}`));
    };
    worker.onmessageerror = () => {
        failAll(workerFailure('edit_mode_worker_message_error'));
    };

    return {
        call(type, payload, timeoutMs = callTimeoutMs) {
            nextId += 1;
            const id = nextId;

            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(workerFailure(`edit_mode_worker_timeout:${type}`));
                }, timeoutMs);

                pending.set(id, {resolve, reject, timer});
                worker.postMessage({id, type, payload});
            });
        },
        destroy() {
            failAll(workerFailure('edit_mode_worker_destroyed'));
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
 * @param {(options: Object) => Object} [options.backendFactory] — test seam; defaults to
 *   dynamically importing the worker artifact and using its createRenderBackend export
 * @param {number} [options.callTimeoutMs] — test seam for the per-call worker timeout
 * @returns {Promise<{mode: 'worker'|'main', render(url: string, options?: {markers?: boolean}): Promise<{status: number, html: string, url: string}>, setTheme(theme: Record<string, string>): Promise<void>, destroy(): void}>}
 */
export async function startRenderClient({
    siteUrl,
    contentApiKey,
    config,
    theme,
    workerUrl,
    workerFactory = createBlobBootstrapWorker,
    backendFactory = null,
    callTimeoutMs = WORKER_CALL_TIMEOUT_MS
}) {
    async function createMainThreadBackend(initialTheme) {
        let factory = backendFactory;

        if (!factory) {
            // The worker artifact doubles as the main-thread renderer module —
            // one renderer copy in the build, and after a failed worker boot
            // this import is usually served straight from the HTTP cache.
            const module = await import(/* @vite-ignore */ workerUrl);
            if (typeof module?.createRenderBackend !== 'function') {
                throw new Error('edit_mode_worker_module_invalid');
            }
            factory = module.createRenderBackend;
        }

        const backend = factory({siteUrl, contentApiKey, config});
        await backend.setTheme(initialTheme);
        return backend;
    }

    if (!workerUrl && !backendFactory) {
        throw new Error('edit_mode_renderer_unavailable');
    }

    if (workerUrl) {
        let blobUrl = null;
        let rpc = null;

        try {
            const created = workerFactory(workerUrl);
            blobUrl = created.blobUrl ?? null;
            rpc = createWorkerRpc(created.worker, callTimeoutMs);

            await rpc.call('init', {siteUrl, contentApiKey, config, theme}, WORKER_BOOT_TIMEOUT_MS);
        } catch {
            // Fall through to the main-thread backend below.
            if (rpc) {
                rpc.destroy();
                rpc = null;
            }
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                blobUrl = null;
            }
        }

        if (rpc) {
            const workerRpc = rpc;
            // The last theme the renderer accepted — what the failover
            // backend boots with before retrying the failed call.
            let currentTheme = theme;
            let fallbackBackend = null;

            const failOverToMainThread = async () => {
                workerRpc.destroy();
                if (blobUrl) {
                    URL.revokeObjectURL(blobUrl);
                    blobUrl = null;
                }
                fallbackBackend = await createMainThreadBackend(currentTheme);
            };

            return {
                mode: 'worker',
                async render(url, options = {}) {
                    if (fallbackBackend) {
                        return fallbackBackend.render(url, options);
                    }

                    try {
                        return await workerRpc.call('render', {url, markers: options.markers});
                    } catch (error) {
                        if (!error?.workerFailure) {
                            throw error;
                        }
                        await failOverToMainThread();
                        return fallbackBackend.render(url, options);
                    }
                },
                async setTheme(nextTheme) {
                    if (fallbackBackend) {
                        await fallbackBackend.setTheme(nextTheme);
                        currentTheme = nextTheme;
                        return;
                    }

                    try {
                        await workerRpc.call('set-theme', {theme: nextTheme});
                        currentTheme = nextTheme;
                    } catch (error) {
                        if (!error?.workerFailure) {
                            throw error;
                        }
                        await failOverToMainThread();
                        await fallbackBackend.setTheme(nextTheme);
                        currentTheme = nextTheme;
                    }
                },
                destroy() {
                    workerRpc.destroy();
                    if (blobUrl) {
                        URL.revokeObjectURL(blobUrl);
                        blobUrl = null;
                    }
                }
            };
        }
    }

    const backend = await createMainThreadBackend(theme);

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
