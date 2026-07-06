export const TURNSTILE_API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Creates a Turnstile verifier bound to a document (the main page for
 * data-attribute forms, or Portal's popup iframe document).
 *
 * The widget runs invisibly (`appearance: 'interaction-only'`,
 * `execution: 'execute'`) inside an overlay this helper creates in the given
 * document. The overlay is only made visible if Cloudflare requires user
 * interaction (`before-interactive-callback`) and is hidden again afterwards.
 *
 * Tokens are single-use: the widget is reset before every execution so a
 * failed submit gets a fresh token on retry.
 *
 * NOTE (from the srcDoc iframe spike, see docs/plans/cloudflare-turnstile.md):
 * - only inject into a document that is fully in place — an iframe's transient
 *   about:blank document silently discards injected scripts. Callers pass the
 *   settled document (Portal's Frame exposes it after its load event).
 * - the widget renders in a closed shadow root, so the overlay sizes its own
 *   box instead of measuring the widget (standard widget is ~300x65).
 *
 * @param {Object} options
 * @param {Document} options.doc document to render into
 * @param {string} options.sitekey Turnstile sitekey
 * @returns {{getToken: () => Promise<string>, destroy: () => void}}
 */
export function createTurnstile({doc, sitekey}) {
    const win = doc.defaultView;

    let scriptPromise = null;
    let overlay = null;
    let widgetContainer = null;
    let widgetId = null;
    let pending = null;

    function loadTurnstile() {
        if (win.turnstile) {
            return Promise.resolve(win.turnstile);
        }
        if (!scriptPromise) {
            scriptPromise = new Promise((resolve, reject) => {
                const script = doc.createElement('script');
                script.src = TURNSTILE_API_URL;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    if (win.turnstile) {
                        resolve(win.turnstile);
                    } else {
                        reject(new Error('Failed to load security verification'));
                    }
                };
                script.onerror = () => {
                    scriptPromise = null;
                    reject(new Error('Failed to load security verification'));
                };
                doc.head.appendChild(script);
            });
        }
        return scriptPromise;
    }

    function ensureOverlay() {
        if (overlay) {
            return;
        }
        overlay = doc.createElement('div');
        overlay.dataset.testid = 'turnstile-overlay';
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'display: none',
            'align-items: center',
            'justify-content: center',
            'background: rgba(0, 0, 0, 0.4)',
            'z-index: 9999999'
        ].join('; ');

        // The widget lives in a closed shadow root, so give it a fixed-size
        // box rather than trying to measure it
        widgetContainer = doc.createElement('div');
        widgetContainer.style.cssText = [
            'background: #fff',
            'border-radius: 8px',
            'padding: 20px',
            'min-width: 300px',
            'min-height: 65px'
        ].join('; ');

        overlay.appendChild(widgetContainer);
        doc.body.appendChild(overlay);
    }

    function showOverlay() {
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    function hideOverlay() {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    function settle(fn, value) {
        hideOverlay();
        const current = pending;
        pending = null;
        if (current) {
            current[fn](value);
        }
    }

    async function getToken() {
        if (pending) {
            return pending.promise;
        }

        const turnstile = await loadTurnstile();
        ensureOverlay();

        if (widgetId === null) {
            widgetId = turnstile.render(widgetContainer, {
                sitekey,
                appearance: 'interaction-only',
                execution: 'execute',
                callback: (token) => {
                    settle('resolve', token);
                },
                'error-callback': () => {
                    settle('reject', new Error('Security verification failed'));
                    // Tell Turnstile the error was handled (suppresses its console noise)
                    return true;
                },
                'expired-callback': () => {
                    settle('reject', new Error('Security verification expired'));
                },
                'before-interactive-callback': () => {
                    showOverlay();
                },
                'after-interactive-callback': () => {
                    hideOverlay();
                }
            });
        } else {
            // Tokens are single-use — reset so a retry mints a fresh one
            turnstile.reset(widgetId);
        }

        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        pending = {promise, resolve, reject};

        turnstile.execute(widgetId);

        return promise;
    }

    function destroy() {
        if (pending) {
            settle('reject', new Error('Security verification cancelled'));
        }
        if (widgetId !== null && win.turnstile) {
            win.turnstile.remove(widgetId);
            widgetId = null;
        }
        if (overlay) {
            overlay.remove();
            overlay = null;
            widgetContainer = null;
        }
    }

    return {getToken, destroy};
}
