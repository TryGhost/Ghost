'use strict';

/*
 * Architectural boundary rules for ghost/core, enforced on the resolved module
 * graph. These mirror the `ghost/node/no-restricted-require` rules that used to
 * live in ghost/core/eslint.config.mjs; moving them here lets us drop the
 * custom eslint-plugin-ghost rule when migrating off ESLint, and catches ESM
 * imports the require-only rule could not.
 *
 * Run from the repo root, so paths are anchored on `^ghost/core/core/`.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
    forbidden: [
        // ============================================================
        // shared/ must not require server/* or frontend/*
        // ============================================================
        {
            name: 'shared-not-server-or-frontend',
            comment: 'Invalid require of core/server or core/frontend from core/shared.',
            severity: 'error',
            from: {path: '^ghost/core/core/shared/'},
            to: {path: '^ghost/core/core/(server|frontend)/'}
        },
        // ============================================================
        // Frontend must not require server/models directly
        // ============================================================
        {
            name: 'frontend-not-server-models',
            comment: 'Invalid require of core/server/models from core/frontend. Fetch content through the public Content API (api.postsPublic / api.pagesPublic), injected via core/frontend/services/proxy — not the model layer directly. See #28420.',
            severity: 'error',
            from: {path: '^ghost/core/core/frontend/'},
            to: {path: '^ghost/core/core/server/models/'}
        },
        // ============================================================
        // Frontend must cross to server only via proxy (with allowlist)
        // ============================================================
        {
            name: 'frontend-to-server-via-proxy-only',
            comment: 'Invalid require of core/server from core/frontend. Cross only via the proxy seam (core/frontend/services/proxy.js).',
            severity: 'error',
            from: {
                path: '^ghost/core/core/frontend/',
                // Adding files to this list is an anti-pattern
                // Goal: Work down until only proxy.js remains
                pathNot: [
                    // The sanctioned seam.
                    '^ghost/core/core/frontend/services/proxy\\.js$',

                    // Composition root wiring (less wrong).
                    '^ghost/core/core/frontend/web/site\\.js$',
                    '^ghost/core/core/frontend/web/middleware/frontend-caching\\.js$',
                    '^ghost/core/core/frontend/web/middleware/handle-image-sizes\\.js$',
                    '^ghost/core/core/frontend/web/routers/link-redirects\\.js$',
                    '^ghost/core/core/frontend/web/routers/serve-favicon\\.js$',
                    '^ghost/core/core/frontend/apps/private-blogging/lib/router\\.js$',

                    // Leaks that bypass the proxy (fix first).
                    '^ghost/core/core/frontend/services/routing/controllers/unsubscribe\\.js$', // services/members + settings-helpers
                    '^ghost/core/core/frontend/services/routing/router-manager\\.js$', // server/lib/common/events bus
                    '^ghost/core/core/frontend/services/sitemap/site-map-manager\\.js$' // server/lib/common/events bus
                ]
            },
            to: {path: '^ghost/core/core/server/'}
        },
        // ============================================================
        // Server must not require frontend (with allowlist)
        // ============================================================
        {
            name: 'server-not-frontend',
            comment: 'Invalid require of core/frontend from core/server. The server must not depend on the frontend rendering layer.',
            severity: 'error',
            from: {
                path: '^ghost/core/core/server/',
                // Adding files to this list is an anti-pattern
                // Goal: Work down until the list is empty
                pathNot: [
                    // Composition root: mounts the frontend Express app onto the server (less wrong).
                    '^ghost/core/core/server/web/parent/frontend\\.js$',

                    // Leak: route-settings reaches into the frontend routing config for QUERY/TAXONOMIES (fix first — config should be injected, see the in-file TODO).
                    '^ghost/core/core/server/services/route-settings/validate\\.js$',
                    '^ghost/core/core/server/services/route-settings/activation-bridge\\.ts$'
                ]
            },
            to: {path: '^ghost/core/core/frontend/'}
        }
    ],
    options: {
        doNotFollow: {path: 'node_modules'},
        exclude: {path: '(^|/)(node_modules|coverage|coverage-next|test|built)/'}
    }
};

