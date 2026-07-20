'use strict';

/*
 * Architectural boundary rules for the monorepo, enforced on the resolved
 * module graph (require AND import). Two sections:
 *
 *   ghost/core  — layer separation inside the Ghost server: shared/ must stay
 *                 dependency-free, frontend/ crosses to server/ only via the
 *                 proxy seam, and server/ must not reach into the frontend
 *                 rendering layer. Paths are anchored on `^ghost/core/core/`.
 *
 *   apps/       — design system layer hierarchy and public/admin separation.
 *                 shade/ and admin-x-design-system/ are leaf packages that
 *                 nothing above them may pull back into. admin-x-framework/
 *                 sits above them but below feature apps. Public UMD bundles
 *                 (portal, comments-ui, etc.) must not depend on admin libs.
 *
 *                 Workspace packages appear as unresolved `@tryghost/*` module
 *                 specifiers in the graph (pnpm workspace symlinks are stopped
 *                 by doNotFollow:node_modules), so `to.path` matches on
 *                 package name rather than a file path.
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
        },

        // ============================================================
        // apps/ — shade/ is the foundation; must not depend on higher layers
        // ============================================================
        {
            name: 'shade-is-leaf',
            comment: 'shade/ must not depend on admin-x-framework or admin-x-design-system. It is the foundation layer.',
            severity: 'error',
            from: {path: '^apps/shade/'},
            to: {path: '^@tryghost/(admin-x-framework|admin-x-design-system)'}
        },
        // ============================================================
        // apps/ — admin-x-design-system/ is a leaf; must not depend on higher layers
        // ============================================================
        {
            name: 'admin-x-design-system-is-leaf',
            comment: 'admin-x-design-system/ must not depend on shade or admin-x-framework.',
            severity: 'error',
            from: {path: '^apps/admin-x-design-system/'},
            to: {path: '^@tryghost/(shade|admin-x-framework)'}
        },
        // ============================================================
        // apps/ — admin-x-framework/ must not depend on feature apps
        // ============================================================
        {
            name: 'framework-not-feature-apps',
            comment: 'admin-x-framework/ must not depend on feature apps (activitypub, posts, admin-x-settings). The framework layer sits below the feature layer.',
            severity: 'error',
            from: {path: '^apps/admin-x-framework/'},
            to: {path: '^@tryghost/(activitypub|posts|admin-x-settings)'}
        },
        // ============================================================
        // apps/ — new admin apps must not use the legacy design system
        // ============================================================
        {
            name: 'new-admin-apps-not-admin-x-design-system',
            comment: 'New admin apps must use shade, not admin-x-design-system.',
            severity: 'error',
            from: {
                // Adding apps to this list is the goal as each migrates off admin-x-design-system
                // Goal: Work up until admin-x-settings joins and admin-x-design-system can be removed
                path: '^apps/(activitypub|posts)/'
            },
            to: {path: '^@tryghost/admin-x-design-system'}
        },
        // ============================================================
        // apps/ — public UMD apps must not depend on admin-only libraries
        // ============================================================
        {
            name: 'public-apps-not-admin-libs',
            comment: 'Public UMD apps (portal, comments-ui, etc.) must not depend on admin-only libraries (shade, admin-x-framework, admin-x-design-system).',
            severity: 'error',
            from: {path: '^apps/(portal|comments-ui|signup-form|sodo-search|announcement-bar|admin-toolbar)/'},
            to: {path: '^@tryghost/(shade|admin-x-framework|admin-x-design-system)'}
        }
    ],
    options: {
        doNotFollow: {path: 'node_modules'},
        exclude: {path: '(^|/)(node_modules|coverage|coverage-next|test|built|dist)/'}
    }
};

