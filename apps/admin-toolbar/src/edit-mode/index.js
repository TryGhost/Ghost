/**
 * Edit-mode chunk entry — built as a standalone ES module
 * (umd/admin-toolbar-editor.min.js, see vite.editor.config.mjs) and loaded at
 * runtime by src/edit-mode/loader.js. It must never be statically imported
 * from the main toolbar bundle, or it would get inlined into the IIFE.
 *
 * Module contract (stable boundary between the toolbar shell and the editor):
 * - `mount({config, user})` starts edit mode and returns `{unmount()}`.
 * - `unmount()` tears everything down and restores the page.
 *
 * The internals live in session.js (orchestration), render-client.js /
 * render-backend.js / worker.js (worker-first rendering with main-thread
 * fallback), swap.js (in-place document swap), draft-store.js (the draft
 * seam), theme-api.js (Admin API), ui.js + interactions.js (Preact overlay
 * and click-to-edit). worker.js is a separate build artifact
 * (umd/admin-toolbar-editor-worker.min.js) — everything else bundles into
 * this chunk.
 */
import {createEditSession} from './session';

// Unique sentinel — tests assert it is absent from the main toolbar bundle to
// prove the chunk isn't inlined. Keep it out of any file the main bundle imports.
export const EDIT_MODE_SENTINEL = 'ghost-admin-toolbar-edit-mode-chunk-4f1c9d';

/**
 * @param {{config: Object, user: Object}} context
 * @returns {{unmount(): void}}
 */
export function mount({config, user}) {
    const session = createEditSession({config, user});

    // Boot is async (theme download, renderer compile); failures surface in
    // the session's own UI bar rather than rejecting mount — the toolbar
    // shell treats mount as fire-and-forget once the module has loaded.
    session.start();

    return {
        unmount() {
            session.destroy();
        }
    };
}
