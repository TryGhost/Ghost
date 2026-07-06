/**
 * SPIKE — ESM/browser entry for @tryghost/i18n.
 *
 * Uses the static locale registry (no dynamic require) so any ESM bundler
 * (Vite/Rolldown/esbuild) resolves and tree-shakes locale JSON statically.
 * Theme resources are stubbed to `{}` — themes are a Node-only, fs-backed
 * concept and never reach the browser (matches the old index.browser.js).
 */
import i18nCore from './lib/i18n-core.js';
import {getResource} from './lib/locale-registry.generated.mjs';

const {createI18n, createGenerateResources, LOCALE_DATA, SUPPORTED_LOCALES} = i18nCore;

// Static-registry loader: returns undefined for an unknown pair so the core
// falls back to English (mirrors the CJS try/catch fallback).
function registryLoader(locale, ns) {
    return getResource(locale, ns);
}

const generateResources = createGenerateResources(registryLoader);

function generateThemeResources(lng) {
    return {
        [lng]: {
            theme: {}
        }
    };
}

const i18n = createI18n({generateThemeResources, generateResources});

i18n.LOCALE_DATA = LOCALE_DATA;
i18n.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
i18n.generateResources = generateResources;
i18n.default = i18n;

export default i18n;
export {LOCALE_DATA, SUPPORTED_LOCALES, generateResources};
