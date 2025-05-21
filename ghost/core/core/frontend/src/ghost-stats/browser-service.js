/**
 * @typedef {Object} CustomWindow
 * @property {any} [__nightmare]
 * @property {any} [Cypress]
 * @property {any} [Tinybird]
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
        if (target === 'window') {
            this.window?.addEventListener(event, callback);
        } else if (target === 'document') {
            this.document?.addEventListener(event, callback);
        }
    }

    removeEventListener(target, event, callback) {
        if (target === 'window') {
            this.window?.removeEventListener(event, callback);
        } else if (target === 'document') {
            this.document?.removeEventListener(event, callback);
        }
    }

    isTestEnvironment() {
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
        const original = this.window?.history?.[method];
        if (original) {
            this.window.history[method] = (...args) => {
                original.apply(this.window.history, args);
                callback();
            };
        }
    }
} 