/**
 * @typedef {Object} CustomWindow
 * @property {any} [__nightmare]
 * @property {any} [Cypress]
 * @property {any} [Tinybird]
 * @property {boolean} [__GHOST_SYNTHETIC_MONITORING__]
 */

/**
 * @typedef {Window & typeof globalThis & CustomWindow} ExtendedWindow
 */

export class BrowserService {
    /**
     * @param {ExtendedWindow} [window]
     * @param {Document} [document]
     */
    constructor(window = globalThis.window, document = globalThis.document) {
        this.window = window;
        this.document = document;
    }

    getNavigator() {
        return this.window?.navigator;
    }

    getLocation() {
        return this.window?.location;
    }

    getTimezone() {
        return this.window?.Intl?.DateTimeFormat().resolvedOptions().timeZone;
    }

    getCurrentScript() {
        return this.document?.currentScript;
    }

    getVisibilityState() {
        return this.document?.visibilityState;
    }

    setTimeout(callback, delay) {
        return this.window?.setTimeout(callback, delay);
    }

    clearTimeout(id) {
        return this.window?.clearTimeout(id);
    }

    addEventListener(target, event, callback) {
        const validTargets = ['window', 'document'];
        if (!validTargets.includes(target)) {
            /* istanbul ignore next */
            throw new TypeError(
                `BrowserService.addEventListener: unknown target "${target}". ` +
                'Expected "window" or "document".'
            );
        }

        if (target === 'window') {
            this.window?.addEventListener(event, callback);
        } else if (target === 'document') {
            this.document?.addEventListener(event, callback);
        }
    }

    removeEventListener(target, event, callback) {
        const validTargets = ['window', 'document'];
        if (!validTargets.includes(target)) {
            /* istanbul ignore next */
            throw new TypeError(
                `BrowserService.removeEventListener: unknown target "${target}". ` +
                'Expected "window" or "document".'
            );
        }

        if (target === 'window') {
            this.window?.removeEventListener(event, callback);
        } else if (target === 'document') {
            this.document?.removeEventListener(event, callback);
        }
    }

    isTestEnvironment() {
        // Allow synthetic monitoring to bypass test environment detection
        if (this.window?.__GHOST_SYNTHETIC_MONITORING__ === true) {
            return false;
        }
        
        return !!(
            this.window && (
                this.window.__nightmare ||
                this.window.navigator?.webdriver ||
                this.window.Cypress
            )
        );
    }

    fetch(url, options) {
        return this.window?.fetch(url, options);
    }

    wrapHistoryMethod(method, callback) {
        // Skip if already wrapped
        if (this.window?.history?.[method]?.__ghostWrapped) {
            return;
        }

        const original = this.window?.history?.[method];
        if (original) {
            this.window.history[method] = (...args) => {
                const result = original.apply(this.window.history, args);
                callback();
                return result;
            };
            // Mark as wrapped to prevent double-wrapping
            this.window.history[method].__ghostWrapped = true;
        }
    }
} 