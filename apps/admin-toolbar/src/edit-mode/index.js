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
 * This is a placeholder implementation; the real editor (worker rendering,
 * inline text edits, publish) replaces the internals in the next part while
 * keeping the mount/unmount contract.
 */

// Unique sentinel — tests assert it is absent from the main toolbar bundle to
// prove the chunk isn't inlined. Keep it out of any file the main bundle imports.
export const EDIT_MODE_SENTINEL = 'ghost-admin-toolbar-edit-mode-chunk-4f1c9d';

const INDICATOR_ID = 'ghost-admin-toolbar-edit-mode-indicator';

// `context` is {config, user} — unused by the placeholder, consumed by part 2
export function mount(context) {
    let indicator = document.getElementById(INDICATOR_ID);

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = INDICATOR_ID;
        indicator.dataset.sentinel = EDIT_MODE_SENTINEL;
        indicator.style.cssText = [
            'position:fixed',
            'top:16px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:9999999',
            'padding:6px 12px',
            'border-radius:6px',
            'background:#15171a',
            'color:#fff',
            'font:600 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,.25)'
        ].join(';');
        indicator.textContent = 'Edit mode active (placeholder)';
        document.body.appendChild(indicator);
    }

    return {
        unmount() {
            indicator?.remove();
            indicator = null;
        }
    };
}
