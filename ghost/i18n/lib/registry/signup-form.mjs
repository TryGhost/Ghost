// Public entry for the 'signup-form' namespace. Import as '@tryghost/i18n/registry/signup-form'.
//
// Locales are collected with Vite's `import.meta.glob` (eager): the bundler
// statically includes ONLY this namespace's locale JSON and drops the rest.
// Vite-only by design — every consumer of this browser path builds with Vite.
import {createNamespacedI18n} from '../esm-factory.mjs';

const modules = import.meta.glob('../../locales/*/signup-form.json', {eager: true, import: 'default'});

const REGISTRY = {};
for (const [filePath, resource] of Object.entries(modules)) {
    const locale = filePath.match(/\/locales\/([^/]+)\//)[1];
    REGISTRY[locale] = resource;
}

const i18n = createNamespacedI18n(REGISTRY, 'signup-form');

export default i18n;
export const {LOCALE_DATA, SUPPORTED_LOCALES, generateResources} = i18n;
