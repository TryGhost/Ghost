import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    // UMD bundle (no Vite HMR runtime), so the react-refresh rule is meaningless.
    reactRefresh: false,
    // LEGACY: Tailwind v3. Migration to v4 is a multi-day class/theme rewrite +
    // CDN regression testing. Tracked separately; this override stays until
    // the migration lands.
    legacyTailwindV3ConfigPath: `${import.meta.dirname}/tailwind.config.js`,
    i18next: true,
    sortImports: true,
    ignores: ['umd/**/*', 'dist/**/*'],
    // Matches main's behavior: package.json lints `src` only — test/ is not
    // linted in CI. Keep test/ out of srcGlobs so test-only relaxations
    // (Playwright fixture destructure pattern, `let` in HSL helper) don't
    // bleed into src.
    testGlobs: false,
    extraSrcRules: {
        // TODO: 41 legacy `any` violations. Remove this override after typing
        // them properly (mostly external API response shapes — needs careful
        // typing, not a 1-line fix per).
        '@typescript-eslint/no-explicit-any': 'off',
        // TODO: 22 legacy `exhaustive-deps` violations from newly-loading the
        // react-hooks plugin in this workspace (it was previously silent because
        // the plugin wasn't registered). Each fix is a per-call-site judgment
        // (add dep / wrap in useCallback / suppress with reason). Remove this
        // override after the cleanup PR.
        'react-hooks/exhaustive-deps': 'off'
    }
});
