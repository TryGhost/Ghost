/**
 * Shared ESM factory for the browser/static-registry build.
 *
 * Given a single-namespace registry (locale-code -> resource JSON), returns an
 * i18n factory with the SAME call signature the CJS package exposes:
 *   i18n(locale, ns, options) -> initialised i18next instance
 *
 * Theme resources are stubbed to `{}` — themes are a Node-only, fs-backed concept
 * and never reach the browser (matches the old index.browser.js).
 *
 * The namespace is fixed at build time by which per-namespace registry module is
 * imported, so bundlers include ONLY that namespace's locale files.
 */
import * as i18nCore from './i18n-core.js';

const {createI18n, createGenerateResources, LOCALE_DATA, SUPPORTED_LOCALES} = i18nCore;

export function createNamespacedI18n(registry, boundNamespace) {
    // Registry loader: returns undefined for an unknown locale so the core falls
    // back to English (mirrors the CJS try/catch fallback).
    const generateResources = createGenerateResources(locale => registry[locale]);

    function generateThemeResources(lng) {
        return {
            [lng]: {
                theme: {}
            }
        };
    }

    const i18n = createI18n({generateResources, generateThemeResources});

    i18n.LOCALE_DATA = LOCALE_DATA;
    i18n.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
    i18n.generateResources = generateResources;
    i18n.namespace = boundNamespace;
    i18n.default = i18n;

    return i18n;
}

export {LOCALE_DATA, SUPPORTED_LOCALES};
