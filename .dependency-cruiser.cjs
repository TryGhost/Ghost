'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { sourceExclusions } = require('./tools/scripts/ci/service-dependency-resolver.mjs');

// Keep service policy here. The audit applies it to every service; normal lint
// applies it only to entries marked migrated in the inventory.
const servicesRoot = 'ghost/core/server/services';
const auditServices = process.env.GHOST_SERVICE_DEPENDENCY_AUDIT === '1';
const { services } = yaml.load(
  readFileSync(path.join(__dirname, servicesRoot, 'service-inventory.yaml'), 'utf8'),
);
const migratedServices = Object.entries(services)
  .filter(([, entry]) => entry.migrated === true)
  .map(([name]) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const serviceImplementations = {
  path: `^${servicesRoot}/(${auditServices ? '[^/]+' : migratedServices || '(?!)'})(?:/|$)`,
  pathNot: `^${servicesRoot}/[^/]+/index\\.${auditServices ? '(?:js|ts)' : 'ts'}$`,
};

// Explicit code-library and contract allowances, not application instances.
// Keep each package or file named individually and explain additions here.
const serviceDependencyAllowlist = [
  '(^|/)node_modules/@tryghost/errors/|^@tryghost/errors$', // Error classes and formatting.
  '(^|/)node_modules/@tryghost/tpl/|^@tryghost/tpl$', // Message interpolation.
  '(^|/)node_modules/@tryghost/security/|^@tryghost/security$', // Token, URL and password primitives; no application instances.
  '(^|/)node_modules/zod/|^zod$', // Schema construction and validation.
  '(^|/)node_modules/bson-objectid/|^bson-objectid$', // ObjectId generation and conversion.
  '^@tryghost/app-contracts/manifest$|^packages/app-contracts/(src|build)/manifest/index\\.(ts|js)$', // Shared manifest schemas and validation.
  '^@tryghost/adapter-base-upgrade$|^packages/adapters/upgrade-base/(src|build)/index\\.(ts|js)$', // Upgrade adapter contract schemas and error class.
  '^@tryghost/checkout$|^packages/checkout/(src|build)/index\\.(ts|js)$', // Measured Stripe Checkout countries, ports and fonts shared with Admin; no application instances.
  '^@tryghost/parse-email-address/mailbox$|^packages/parse-email-address/(src|build)/mailbox\\.(ts|js)$', // Mailbox parsing and text formatting; no sender policy or application instances.
  '^@tryghost/metafield-types/identity$|^packages/metafield-types/(src|build)/identity\\.(ts|js)$', // Metafield namespace, key and part schemas and the identity codec.
  '^lodash/isEmpty(?:\\.js)?$|(^|/)node_modules/lodash/isEmpty\\.js$', // Pure value/collection inspection; only the isEmpty helper.
  '^@tryghost/nql$|(^|/)node_modules/@tryghost/nql/index\\.js$', // Caller-local query parsing and JSON matching; no application instances or I/O.
  '^(node:)?crypto$', // Cryptographic algorithms and key generation.
  '^(node:)?util$', // Node utilities, including promisify.
  '^ghost/core/kernel/clock\\.ts$', // Shared clock helpers and legacy date compatibility.
  '^ghost/core/server/lib/db-types/date\\.ts$', // Database date codec.
  '^ghost/core/server/lib/db-types/boolean\\.ts$', // Database boolean codec.
  '^ghost/core/server/lib/db-types/json\\.ts$', // Database JSON codec.
  '^ghost/core/server/lib/case-keys\\.ts$', // camelCase and snake_case key conversion between models, rows and wire shapes.
  '^ghost/core/server/lib/parse-request\\.ts$', // Request body parsing into validation errors on the named property.
  '^ghost/core/server/lib/public-jwk\\.ts$', // Key conversion and thumbprints; includes memoization.
  '^ghost/core/server/lib/signed-webhook\\.ts$', // Request signing/formatting and URL sanitization; no running transport.
  '^ghost/core/server/services/jobs-service/job\\.ts$', // Job base class, not the running service.
];

/*
 * Architectural boundary rules for the monorepo, enforced on the resolved
 * module graph (require AND import). Two sections:
 *
 *   ghost  — layer separation inside the Ghost server: shared/ must stay
 *                 dependency-free, frontend/ crosses to server/ only via the
 *                 proxy seam, and server/ must not reach into the frontend
 *                 rendering layer. Paths are anchored on `^ghost/core/`.
 *
 *   apps/       — design system layer hierarchy and public/admin separation.
 *                 shade/ is a leaf package that nothing above it may pull
 *                 back into. admin-x-framework/ sits above it but below
 *                 feature apps. Public UMD bundles (portal, comments-ui,
 *                 etc.) must not depend on admin libs.
 *
 *                 Workspace imports may resolve to source through package exports.
 *                 Match both package specifiers and workspace paths so resolution
 *                 cannot bypass a boundary.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'service-dependencies',
      comment:
        'Wire application dependencies in the root index.ts and inject them into the implementation.',
      severity: 'error',
      from: serviceImplementations,
      to: {
        // $1 is the service name captured by from.path.
        pathNot: [...serviceDependencyAllowlist, `^${servicesRoot}/$1/`],
        dependencyTypesNot: ['type-only', 'type-import'],
      },
    },
    {
      name: 'service-own-root',
      comment: 'Service implementations must not retrieve dependencies from their own wiring root.',
      severity: 'error',
      from: serviceImplementations,
      to: {
        path: `^${servicesRoot}/$1/index\\.(js|ts)$`,
        dependencyTypesNot: ['type-only', 'type-import'],
      },
    },
    {
      name: 'service-unresolved',
      comment: 'Resolve this runtime import so the service dependency rule can be checked.',
      severity: 'error',
      from: serviceImplementations,
      to: { couldNotResolve: true, dependencyTypesNot: ['type-only', 'type-import'] },
    },
    // Kernel primitives must be independent of the application they support.
    {
      name: 'kernel-not-application',
      comment: 'Kernel code must not import application code, including shared.',
      severity: 'error',
      from: { path: '^ghost/core/kernel/' },
      to: { path: '^ghost/', pathNot: '^ghost/core/kernel/' },
    },
    // ============================================================
    // shared/ must not require server/* or frontend/*
    // ============================================================
    {
      name: 'shared-not-server-or-frontend',
      comment: 'Invalid require of core/server or core/frontend from core/shared.',
      severity: 'error',
      from: { path: '^ghost/core/shared/' },
      to: { path: '^ghost/core/(server|frontend)/' },
    },
    // ============================================================
    // Frontend must not require server/models directly
    // ============================================================
    {
      name: 'frontend-not-server-models',
      comment:
        'Invalid require of core/server/models from core/frontend. Fetch content through the public Content API (api.postsPublic / api.pagesPublic), injected via core/frontend/services/proxy — not the model layer directly. See #28420.',
      severity: 'error',
      from: { path: '^ghost/core/frontend/' },
      to: { path: '^ghost/core/server/models/' },
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
        path: '^ghost/core/frontend/',
        // Adding files to this list is an anti-pattern
        // Goal: Work down until only proxy.js remains
        pathNot: [
          // The sanctioned seam.
          '^ghost/core/frontend/services/proxy\\.js$',

          // Composition root wiring (less wrong).
          '^ghost/core/frontend/web/site\\.js$',
          '^ghost/core/frontend/web/middleware/frontend-caching\\.js$',
          '^ghost/core/frontend/web/middleware/handle-image-sizes\\.js$',
          '^ghost/core/frontend/web/routers/link-redirects\\.js$',
          '^ghost/core/frontend/apps/private-blogging/lib/router\\.js$',
        ],
      },
      to: { path: '^ghost/core/server/' },
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
        path: '^ghost/core/server/',
        // Adding files to this list is an anti-pattern
        // Goal: Work down until the list is empty
        pathNot: [
          // Composition root: mounts the frontend Express app onto the server (less wrong).
          '^ghost/core/server/web/parent/frontend\\.js$',

          // Leak: route-settings reaches into the frontend routing config for QUERY/TAXONOMIES (fix first — config should be injected, see the in-file TODO).
          '^ghost/core/server/services/route-settings/validate\\.js$',
          '^ghost/core/server/services/route-settings/activation-bridge\\.ts$',
        ],
      },
      to: { path: '^ghost/core/frontend/' },
    },

    // ============================================================
    // Core loads sharp only through @tryghost/image-transform
    // ============================================================
    {
      name: 'core-sharp-via-image-transform',
      comment:
        'Invalid import of sharp from ghost. Use getSharp() from @tryghost/image-transform, which restricts the image decoders before anything is decoded.',
      severity: 'error',
      from: { path: '^ghost/core/' },
      to: { path: '(^|/)node_modules/sharp/', dependencyTypesNot: ['type-only'] },
    },

    // ============================================================
    // apps/ — shade/ is the foundation; must not depend on higher layers
    // ============================================================
    {
      name: 'shade-is-leaf',
      comment: 'shade/ must not depend on admin-x-framework. It is the foundation layer.',
      severity: 'error',
      from: { path: '^apps/shade/' },
      to: { path: '^@tryghost/admin-x-framework($|/)|^apps/admin-x-framework/' },
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
      to: { path: '^@tryghost/activitypub($|/)|^apps/activitypub/' },
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
      to: { path: '^@tryghost/(shade|admin-x-framework)($|/)|^apps/(shade|admin-x-framework)/' },
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
    // apps/ — test data must not reach production source
    // ============================================================
    {
      name: 'no-test-data-in-production-source',
      comment:
        'App source must not import @tryghost/test-data. Only the ./selectors/* subpath is allowed, and only for testids — product copy is declared in the component that renders it. Tests, fixtures, and test utilities are exempt.',
      severity: 'error',
      from: {
        path: '^apps/[^/]+/src/',
        pathNot: ['\\.test\\.[^/]+$', '(^|/)__fixtures__/', '(^|/)__test-utils__/'],
      },
      to: {
        // The root entry resolves to the workspace source; the subpaths stay
        // unresolved specifiers. Both shapes are matched.
        path: '^(?:@tryghost/test-data($|/)|packages/testing/test-data/)',
        pathNot: ['^@tryghost/test-data/selectors/', '^packages/testing/test-data/src/selectors/'],
      },
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
        path: '^apps/admin/src/(members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor)/',
        pathNot: ['\\.test\\.(ts|tsx)$'],
      },
      to: {
        path: '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor)($|/)',
        pathNot: [
          '^(?:@/|apps/admin/src/)$1($|/)',
          '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor)/api(\\.ts)?$',

          // Shared-shaped modules that still live inside a domain.
          // Goal: move them under src/shared and work this list down to empty.
          '^(?:@/|apps/admin/src/)settings/components/(?:koenig-loader|error-boundary)$',
          '^(?:@/|apps/admin/src/)posts/list/post-time$',
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
        path: '^apps/admin/src/(?:(?:layout|hooks|providers|utils|schemas)/.+|[^/]+\\.(?:ts|tsx))$',
        pathNot: ['\\.test\\.(ts|tsx)$'],
      },
      to: {
        path: '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor)($|/)',
        pathNot: [
          '^(?:@/|apps/admin/src/)(?:members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor)/api(\\.ts)?$',
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
        path: '^(@/|apps/admin/src/)(members|settings|analytics|posts|tags|comments|automations|onboarding|whats-new|editor|layout)($|/)',
      },
    },
  ],
  options: {
    // Resolve public package exports to authored workspace source when available.
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['source', 'import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      err: { showExternalModulesUnresolved: true },
      markdown: { showExternalModulesUnresolved: true },
    },
    // Use the CLI's supported resolver hook to inspect authored TypeScript,
    // even when build:tsc has emitted adjacent JavaScript.
    webpackConfig: { fileName: './tools/scripts/ci/service-dependency-resolver.mjs' },
    // Keep incoming edges to built packages visible without scanning their output.
    doNotFollow: {
      path: auditServices
        ? `^(?!${servicesRoot}/)`
        : [
            'node_modules',
            '^(?!ghost/core/server/services/)(apps|ghost|packages|koenig)/.*/(build|built|dist)/',
          ],
    },
    // Skip our own tests and emitted companions. All source inside services stays visible:
    // a nested directory name must not hide a production dependency.
    exclude: {
      path: [
        '^(?!ghost/core/server/services/)(apps|ghost|packages)/.*/(coverage|coverage-next|test)/',
        ...sourceExclusions(__dirname),
      ],
    },
  },
};
