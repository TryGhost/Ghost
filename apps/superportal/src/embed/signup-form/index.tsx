/**
 * Third-party embed entry point. Loaded by external sites via:
 *
 *   <script src="signup-form.min.js"
 *           data-site="https://example.ghost.io"
 *           data-title="Newsletter"
 *           data-button-color="#ff0095">
 *   </script>
 *
 * The script tag's `data-*` attributes configure the embed. Multiple script
 * tags on the same page create independent instances (each injects its own
 * root div immediately before the tag).
 *
 * IMPORTANT: `document.currentScript` is only available during synchronous
 * script evaluation. In a UMD bundle this is the module's top-level execution.
 * We capture the reference immediately and pass it into React — by the time
 * any async work or React rendering runs, `document.currentScript` is null.
 *
 * ESM note: `document.currentScript` is always null for `type="module"` scripts.
 * This bundle is intentionally built as UMD (not ESM) for exactly this reason.
 * During Vite dev mode (ESM), the original signup-form used a workaround
 * (`document.querySelector('body script:not([data-used="true"])')`). That
 * workaround is preserved below for dev-server convenience but is NEVER active
 * in the production UMD build.
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {error, warn} from '../../shared/log';
import {ROOT_DIV_CLASS} from './utils/constants';
import {App} from './App';

// --- Capture currentScript synchronously at module evaluation time ---
// Must happen before any import side-effects that could flush a microtask.
const capturedScript: HTMLElement | null =
    (document.currentScript as HTMLElement | null) ??
    // Dev-mode fallback: ESM disables currentScript, so locate the first unused
    // script tag in the body (this never fires in the production UMD bundle).
    (import.meta.env.DEV ? findDevScript() : null);

function findDevScript(): HTMLElement | null {
    const el = document.querySelector(
        'body script:not([data-used="true"])'
    ) as HTMLElement | null;
    if (el) {
        el.dataset.used = 'true';
    }
    return el;
}

/**
 * Find or create the root div immediately preceding the script tag. Inserting
 * it _before_ the tag (not after) matches the original behaviour and keeps the
 * form visually in-flow with surrounding content.
 */
function getRootDiv(scriptTag: HTMLElement): HTMLElement {
    const prev = scriptTag.previousElementSibling;
    if (prev instanceof HTMLElement && prev.className === ROOT_DIV_CLASS) {
        return prev;
    }

    if (!scriptTag.parentElement) {
        throw new Error('[signup-form] Script tag has no parent element');
    }

    const div = document.createElement('div');
    div.className = ROOT_DIV_CLASS;
    scriptTag.parentElement.insertBefore(div, scriptTag);
    return div;
}

function init(): void {
    if (!capturedScript) {
        // This should never happen in a correctly-loaded UMD bundle. Log and
        // bail rather than throwing, so the embedding page keeps working.
        error('[signup-form] Cannot determine script tag — embed not initialised');
        return;
    }

    let rootDiv: HTMLElement;
    try {
        rootDiv = getRootDiv(capturedScript);
    } catch (err) {
        warn('[signup-form] Failed to create root element:', err);
        return;
    }

    const root = createRoot(rootDiv);
    root.render(
        <StrictMode>
            <App scriptTag={capturedScript} />
        </StrictMode>
    );
}

init();
