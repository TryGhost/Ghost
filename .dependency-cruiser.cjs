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
 *                 shade/ is a leaf package that nothing above it may pull
 *                 back into. admin-x-framework/ sits above it but below
 *                 feature apps. Public UMD bundles (portal, comments-ui,
 *                 etc.) must not depend on admin libs.
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
      from: { path: '^ghost/core/core/shared/' },
      to: { path: '^ghost/core/core/(server|frontend)/' },
    },
    // ============================================================
    // Frontend must not require server/models directly
    // ============================================================
    {
      name: 'frontend-not-server-models',
      comment:
        'Invalid require of core/server/models from core/frontend. Fetch content through the public Content API (api.postsPublic / api.pagesPublic), injected via core/frontend/services/proxy — not the model layer directly. See #28420.',
      severity: 'error',
      from: { path: '^ghost/core/core/frontend/' },
      to: { path: '^ghost/core/core/server/models/' },
    },
    // ============================================================
    // Frontend must cross to server only via proxy (with allowlist)
    // ============================================================
    {
      name: 'frontend-to-server-via-proxy-only',
      comment:
        'Invalid require of core/server from core/frontend. Cross only via the proxy seam (core/frontend/services/proxy.js).',
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
        ],
      },
      to: { path: '^ghost/core/core/server/' },
    },
    // ============================================================
    // Server must not require frontend (with allowlist)
    // ============================================================
    {
      name: 'server-not-frontend',
      comment:
        'Invalid require of core/frontend from core/server. The server must not depend on the frontend rendering layer.',
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
          '^ghost/core/core/server/services/route-settings/activation-bridge\\.ts$',
        ],
      },
      to: { path: '^ghost/core/core/frontend/' },
    },

    // ============================================================
    // apps/ — shade/ is the foundation; must not depend on higher layers
    // ============================================================
    {
      name: 'shade-is-leaf',
      comment: 'shade/ must not depend on admin-x-framework. It is the foundation layer.',
      severity: 'error',
      from: { path: '^apps/shade/' },
      to: { path: '^@tryghost/admin-x-framework' },
    },
    // ============================================================
    // apps/ — admin-x-framework/ must not depend on feature apps
    // ============================================================
    {
      name: 'framework-not-feature-apps',
      comment:
        'admin-x-framework/ must not depend on feature apps (activitypub). The framework layer sits below the feature layer.',
      severity: 'error',
      from: { path: '^apps/admin-x-framework/' },
      to: { path: '^@tryghost/activitypub' },
    },
    // ============================================================
    // apps/ — public UMD apps must not depend on admin-only libraries
    // ============================================================
    {
      name: 'public-apps-not-admin-libs',
      comment:
        'Public UMD apps (portal, comments-ui, etc.) must not depend on admin-only libraries (shade, admin-x-framework).',
      severity: 'error',
      from: {
        path: '^apps/(portal|comments-ui|signup-form|sodo-search|announcement-bar|admin-toolbar)/',
      },
      to: { path: '^@tryghost/(shade|admin-x-framework)' },
    },
    // ============================================================
    // apps/ — admin is an app, not a library
    // ============================================================
    {
      name: 'admin-is-app',
      comment:
        'No sibling app or library may depend on @tryghost/admin - whether by package specifier or by relative reach-in. Admin sits at the top of the layer stack.',
      severity: 'error',
      from: { path: '^apps/', pathNot: '^apps/admin/' },
      to: { path: '^@tryghost/admin($|/)|^apps/admin/' },
    },
    // ============================================================
    // apps/admin — domains cross into each other only via api.ts
    // ============================================================
    {
      name: 'admin-domains-cross-via-api-only',
      comment:
        "A domain folder in apps/admin/src may import a different domain only through that domain's public surface (its api.ts). Deep imports couple domains to each other's internals. In-app imports use the @/ alias, which the cruiser sees as an unresolved @/-prefixed specifier; both that shape and resolved relative paths are matched. Test files are exempt.",
      severity: 'error',
      from: {
        path: '^apps/admin/src/(members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new)/',
        pathNot: ['\\.test\\.(ts|tsx)$'],
      },
      to: {
        path: '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new)($|/)',
        pathNot: [
          '^(?:@/|apps/admin/src/)$1($|/)',
          '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new)/api(\\.ts)?$',
        ],
      },
    },
    // ============================================================
    // apps/admin — the shell and layout import domains only via api.ts
    // ============================================================
    {
      name: 'admin-shell-into-domains-via-api-only',
      comment:
        'The admin shell (top-level files in apps/admin/src plus its non-domain support folders) may import a domain only through its api.ts. Same matching notes as admin-domains-cross-via-api-only. Test files are exempt.',
      severity: 'error',
      from: {
        path: '^apps/admin/src/(?:(?:layout|hooks|providers|ember-bridge|utils|schemas)/.+|[^/]+\\.(?:ts|tsx))$',
        pathNot: ['\\.test\\.(ts|tsx)$'],
      },
      to: {
        path: '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new)($|/)',
        pathNot: [
          '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new)/api(\\.ts)?$',
        ],
      },
    },
    // ============================================================
    // apps/admin — shared/ must stay domain-free
    // ============================================================
    {
      name: 'admin-shared-no-domains',
      comment:
        'apps/admin/src/shared must not import from feature domains. Move code used by a single domain into that domain; keep shared/ generic. In-app imports use the @/ alias, which the cruiser sees as an unresolved @/-prefixed specifier.',
      severity: 'error',
      from: { path: '^apps/admin/src/shared/' },
      to: {
        path: '^(@/|apps/admin/src/)(members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|layout)($|/)',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|coverage|coverage-next|test|built|dist)/' },
  },
};
