/* eslint ghost/ghost-custom/no-native-error: off -- browser-side toolbar code:
   errors surface in the toolbar UI, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

import {canManageThemes} from '../auth';

export const EDITOR_CHUNK_FILENAME = 'admin-toolbar-editor.min.js';

/**
 * Decides whether the "Edit" (edit mode) action should be offered at all.
 *
 * Split-admin installs (a custom `admin.url` on a different origin than the
 * site) never get edit mode: the editor swaps the live document in place and
 * talks to the Admin API with the admin session — cross-origin that breaks
 * down because (a) CORS blocks the Admin API requests from the site origin,
 * (b) the Admin API's CSRF/origin protection rejects requests not coming from
 * the admin origin, and (c) admin auth redirects would bounce the user off
 * the page being edited.
 */
export function canShowEditMode(config, user) {
    if (!config?.editModeEnabled || !canManageThemes(user)) {
        return false;
    }

    try {
        return new URL(config.adminUrl ?? window.location.href).origin === window.location.origin;
    } catch {
        return false;
    }
}

let editModulePromise = null;
let mountedHandle = null;

/**
 * Lazily loads the edit-mode chunk (built separately as an ES module beside
 * the main IIFE bundle — see vite.editor.config.mjs) and mounts it.
 *
 * The chunk URL is resolved relative to the toolbar bundle's own URL so it
 * works from any CDN path or the local dev gateway. The runtime-computed URL
 * plus the `@vite-ignore` hint keep rollup from inlining the chunk into the
 * main IIFE (`inlineDynamicImports`).
 *
 * The module load is memoized; a failed load clears the memo so a retry can
 * succeed. Mounting is idempotent — a second call returns the live handle.
 *
 * When the mounted session exits from the inside (the edit bar's Exit button
 * or a fatal boot failure), its onExit clears `mountedHandle` here — so the
 * next call mounts a FRESH session (drafts survive via the chunk's
 * module-level draft store) — and then forwards to the caller's onExit so
 * the Edit button can reset instead of staying stuck in "active" forever.
 *
 * @param {Object} options
 * @param {Object} options.config
 * @param {Object} options.user
 * @param {(info?: {reason: string, message?: string}) => void} [options.onExit]
 * @param {(url: string) => Promise<Object>} [options.importModule] — test seam
 * @returns {Promise<{unmount: () => void}>}
 */
export async function loadAndMountEditMode({config, user, onExit, importModule}) {
    if (mountedHandle) {
        return mountedHandle;
    }

    if (!editModulePromise) {
        const chunkUrl = new URL(EDITOR_CHUNK_FILENAME, config.scriptUrl);
        const load = importModule ?? (url => import(/* @vite-ignore */ url));
        editModulePromise = Promise.resolve(load(chunkUrl.href)).catch((err) => {
            editModulePromise = null;
            throw err;
        });
    }

    const editModule = await editModulePromise;

    if (typeof editModule?.mount !== 'function') {
        editModulePromise = null;
        throw new Error('edit_mode_invalid_module');
    }

    if (!mountedHandle) {
        const handle = editModule.mount({
            config,
            user,
            onExit: (info) => {
                mountedHandle = null;
                onExit?.(info);
            }
        });
        mountedHandle = {
            unmount() {
                mountedHandle = null;
                handle?.unmount?.();
            }
        };
    }

    return mountedHandle;
}
