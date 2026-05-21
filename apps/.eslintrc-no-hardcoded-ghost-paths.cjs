/**
 * Shared ESLint rule: ban hardcoded "/ghost/..." string literals.
 *
 * Any literal that starts with "/ghost/" is site-root-relative, so it
 * silently strips any /blog/ (or other) subdirectory prefix on installs
 * that run Ghost under one. The bug surfaces anywhere such a literal is
 * used — location.href assignments, fetch URLs, JSX hrefs, etc. — so
 * the rule catches the literal at its source, not at any specific
 * usage site.
 *
 * Fix by building the path from getGhostPaths() in
 * @tryghost/admin-x-framework/helpers (use adminRoot for admin paths,
 * apiRoot for API calls). The helper reads window.location.pathname
 * once to derive the correct subdir, so all downstream construction is
 * subdir-safe.
 *
 * Test fixtures and assertions intentionally hardcode /ghost/... paths
 * to verify what production code emits — the override at the bottom
 * exempts them.
 */
module.exports = {
    rules: {
        'no-restricted-syntax': ['error',
            {
                selector: 'Literal[value=/^\\/ghost\\//]',
                message: 'Hardcoded /ghost/... paths break subdirectory installs. Use getGhostPaths() from @tryghost/admin-x-framework/helpers.'
            },
            {
                selector: 'TemplateLiteral[quasis.0.value.raw=/^\\/ghost\\//]',
                message: 'Hardcoded /ghost/... paths break subdirectory installs. Use getGhostPaths() from @tryghost/admin-x-framework/helpers.'
            }
        ]
    },
    overrides: [
        {
            files: [
                'test/**/*.{ts,tsx,js,jsx}',
                'tests/**/*.{ts,tsx,js,jsx}',
                'src/**/*.test.{ts,tsx,js,jsx}',
                // Test utilities live under src/test in some packages (MSW
                // handlers, fixtures, etc.) and intentionally pin literal
                // /ghost/... URLs.
                'src/test/**/*.{ts,tsx,js,jsx}',
                // Ember admin's Mirage mock server pins literal /ghost/...
                // routes; that's by definition not a real install.
                'mirage/**/*.{ts,tsx,js,jsx}'
            ],
            rules: {
                'no-restricted-syntax': 'off'
            }
        }
    ]
};
