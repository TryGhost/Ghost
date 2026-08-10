// CJS-only resource loader: dynamic require against the on-disk locales tree.
// Lives in its own module so the shared `i18n-core` stays free of dynamic
// requires — the ESM/browser build never imports this file, so bundlers
// (Vite/Rolldown/esbuild) never encounter the dynamic-require pattern.
function requireLoader(locale, ns) {
    try {
        return require(`../locales/${locale}/${ns}.json`);
    } catch (err) {
        return require(`../locales/en/${ns}.json`);
    }
}

module.exports = {requireLoader};
