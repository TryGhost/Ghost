/**
 * ESM/browser entry for @tryghost/i18n (default `import`/`browser` condition).
 *
 * Uses the static per-namespace locale registries (no dynamic require) so any ESM
 * bundler (Vite/Rollup/Rolldown/esbuild) resolves locale JSON statically — no
 * `dynamicRequireTargets` shim needed. Theme resources are stubbed to `{}` — themes
 * are a Node-only, fs-backed concept and never reach the browser.
 *
 * This entry preserves the classic synchronous `i18nLib(locale, ns)` signature and
 * therefore statically references ALL namespaces. Public apps that want to bundle
 * only their own namespace's locales should import the per-namespace subpath instead,
 * e.g. `@tryghost/i18n/registry/portal` — that lets bundlers drop the other namespaces.
 */
import * as i18nCore from './lib/i18n-core.js';
import ghost from './lib/registry/ghost.generated.mjs';
import portal from './lib/registry/portal.generated.mjs';
import signupForm from './lib/registry/signup-form.generated.mjs';
import comments from './lib/registry/comments.generated.mjs';
import search from './lib/registry/search.generated.mjs';

const {createI18n, createGenerateResources, LOCALE_DATA, SUPPORTED_LOCALES} = i18nCore;

const REGISTRIES = {
    ghost,
    portal,
    'signup-form': signupForm,
    comments,
    search
};

// Static-registry loader: returns undefined for an unknown locale/namespace so the
// core falls back to English (mirrors the CJS try/catch fallback).
function registryLoader(locale, ns) {
    const registry = REGISTRIES[ns];
    return registry ? registry[locale] : undefined;
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
