'use strict';

const { sourceExclusions } = require('./tools/scripts/ci/service-dependency-resolver.mjs');

// Service policy applies independently of inventory and migration status.
const servicesRoot = 'ghost/core/server/services';
const serviceImplementations = {
  path: `^${servicesRoot}/([^/]+)(?:/|$)`,
  // Legacy JS roots remain wiring candidates; nested indexes are implementations.
  pathNot: `^${servicesRoot}/[^/]+/index\\.(?:js|ts)$`,
};

// Explicit code-library and contract allowances, not application instances.
// Keep each package or file named individually and explain additions here.
const serviceDependencyAllowlist = [
  '(^|/)node_modules/@tryghost/errors/|^@tryghost/errors$', // Error classes and formatting.
  '(^|/)node_modules/@tryghost/tpl/|^@tryghost/tpl$', // Message interpolation.
  '(^|/)node_modules/@tryghost/debug/|^@tryghost/debug$', // Namespaced developer tracing gated by the DEBUG environment variable; no configuration or application instance.
  '(^|/)node_modules/@tryghost/security/|^@tryghost/security$', // Token, URL and password primitives; no application instances.
  '(^|/)node_modules/zod/|^zod$', // Schema construction and validation.
  '(^|/)node_modules/bson-objectid/|^bson-objectid$', // ObjectId generation and conversion.
  '^@tryghost/app-contracts/manifest$|^packages/app-contracts/(src|build)/manifest/index\\.(ts|js)$', // Shared manifest schemas and validation.
  '^@tryghost/app-contracts/identity$|^packages/app-contracts/(src|build)/identity/index\\.(ts|js)$', // Signed-manifest and challenge formats, signing and verification.
  '^@tryghost/adapter-base-upgrade$|^packages/adapters/upgrade-base/(src|build)/index\\.(ts|js)$', // Upgrade adapter contract schemas and error class.
  '^@tryghost/checkout$|^packages/checkout/(src|build)/index\\.(ts|js)$', // Measured Stripe Checkout countries, ports and fonts shared with Admin; no application instances.
  '^@tryghost/parse-email-address/mailbox$|^packages/parse-email-address/(src|build)/mailbox\\.(ts|js)$', // Mailbox parsing and text formatting; no sender policy or application instances.
  '^@tryghost/metafield-types/identity$|^packages/metafield-types/(src|build)/identity\\.(ts|js)$', // Metafield namespace, key and part schemas and the identity codec.
  '^@tryghost/string$|(^|/)node_modules/@tryghost/string/lib/index\\.js$', // String normalization, slugification and HTML escaping.
  '^@tryghost/version$|(^|/)node_modules/@tryghost/version/index\\.js$', // Ghost's version, a process fact fixed when Ghost is built; reads its own package.json once.
  '^@tryghost/referrer-parser$|(^|/)node_modules/@tryghost/referrer-parser/dist/index\\.(cjs|js)$', // Referrer classification from supplied URLs and static lookup data.
  '^lodash/(?!(?:index|lodash|core|fp)(?:\\.js)?$)[a-zA-Z]+(?:\\.js)?$|(^|/)node_modules/lodash/(?!(?:index|lodash|core|fp)\\.js$)[a-zA-Z]+\\.js$', // Individual Lodash functions; not the whole library, its builds or lodash/fp.
  '^@tryghost/nql$|(^|/)node_modules/@tryghost/nql/index\\.js$', // Caller-local query parsing and JSON matching; no application instances or I/O.
  '^@tryghost/mongo-utils$|(^|/)node_modules/@tryghost/mongo-utils/index\\.js$', // Pure helpers over a parsed NQL tree; no application instances or I/O.
  '^@tryghost/html-to-plaintext$|(^|/)node_modules/@tryghost/html-to-plaintext/index\\.js$', // Stateless HTML to plain-text conversion of supplied markup.
  '^handlebars$|(^|/)node_modules/handlebars/lib/index\\.js$', // Template compilation on a caller-created instance; no application instances.
  '^cheerio/slim$|(^|/)node_modules/cheerio/dist/(esm|commonjs)/slim\\.js$', // HTML parsing and selection over supplied strings; only the slim entry, no application instances or I/O.
  '^mime-types$|(^|/)node_modules/mime-types/index\\.js$', // MIME type and extension lookup from static tables; no application instances.
  '^(node:)?crypto$', // Cryptographic algorithms and key generation.
  '^(node:)?util$', // Node utilities, including promisify.
  '^(node:)?path$', // Path string parsing and joining.
  '^(node:)?vm$', // Bounded script execution for caller-owned regex matching with a timeout.
  '^ghost/core/kernel/clock\\.ts$', // Shared clock helpers and legacy date compatibility.
  '^ghost/core/server/lib/db-types/date\\.ts$', // Database date codec.
  '^ghost/core/server/lib/db-types/boolean\\.ts$', // Database boolean codec.
  '^ghost/core/server/lib/db-types/json\\.ts$', // Database JSON codec.
  '^ghost/core/server/lib/common/to-plain\\.ts$', // Bookshelf/plain-object normalization; no application instances or captured state.
  '^ghost/core/server/lib/link-replacer\\.ts$', // HTML link rewriting with caller-owned callbacks; no retained state or application dependencies.
  '^ghost/core/server/lib/magic-link/magic-link\\.js$', // Magic-link constructor with caller-supplied transporter, token provider and content callbacks; no application instances.
  '^ghost/core/server/lib/case-keys\\.ts$', // camelCase and snake_case key conversion between models, rows and wire shapes.
  '^ghost/core/server/lib/ensure-transaction\\.ts$', // Runs a callback in the caller's transaction or a new one on the supplied connection; no application instances.
  '^ghost/core/server/lib/parse-request\\.ts$', // Request body parsing into validation errors on the named property.
  '^ghost/core/server/lib/public-jwk\\.ts$', // Key conversion and thumbprints; includes memoization.
  '^ghost/core/server/lib/signed-webhook\\.ts$', // Request signing/formatting and URL sanitization; no running transport.
  '^ghost/core/server/lib/mail/format-address-for-delivery\\.ts$', // Mailbox formatting for delivery; no sender policy or application instances.
  '^ghost/core/server/lib/email-rendering/inline-css\\.ts$', // CSS inlining of a supplied HTML string with Core's fixed options; no application instances.
  '^ghost/core/server/lib/image/image-content\\.ts$', // Image extension and content predicates; no application instances.
  '^ghost/core/server/lib/image/svg-sanitizer\\.ts$', // SVG buffer sanitization; no application instances.
  '^ghost/core/server/services/jobs-service/job\\.ts$', // Job base class, not the running service.
  '^@tryghost/kg-default-nodes$|^koenig/kg-default-nodes/(src/index\\.ts|build/(cjs|esm)/index\\.js)$', // Whole Koenig default-nodes entry (node classes, renderers and the replacement-string helpers welcome emails use); the package has no narrower export and holds no application instances.
  '^ghost/core/server/lib/email-rendering/email-design\\.js$', // Email design token computation from supplied settings.
  '^ghost/core/server/lib/email-rendering/finalize\\.ts$', // Email CSS inlining and plaintext generation; no application instances.
  '^ghost/core/server/lib/mail/format-address-for-delivery\\.ts$', // Mailbox formatting for delivery; no sender policy or application instances.
];

// Specialist dependencies serve one capability: a file format, a protocol or an
// outside system. Each is imported only by the files or folders listed as its
// owners; adding a consumer means changing this list, so it gets reviewed. A
// specialist dependency that does its own I/O has one owner, its provider
// client: the file that wraps it in the API Ghost needs. Everything else,
// including service roots, uses the provider client. See
// docs/practices/dependencies.md.
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// An installed package, by import specifier or by its location in node_modules.
const npm = (name) => `(^|/)node_modules/${escape(name)}/|^${escape(name)}(/|$)`;
// A workspace package, by specifier or by the source or build entry it resolves to.
const workspace = (name, directory) =>
  `^${escape(name)}$|^${escape(directory)}/(src/index\\.ts|build/((cjs|esm)/)?index\\.js)$`;
// A file in Ghost Core, or a folder when the path ends with a slash.
const core = (file) => `^ghost/core/${escape(file)}${file.endsWith('/') ? '' : '$'}`;
const service = (file) => core(`server/services/${file}`);

const specialistDependencies = [
  // Provider clients.
  {
    // Machine Payments Protocol server.
    dependency: npm('mppx'),
    owners: [service('machine-payments/adapters/mpp-adapter.ts')],
  },
  {
    // x402 payment protocol and the Hono app its middleware runs on.
    dependency: `${npm('hono')}|(^|/)node_modules/@x402/[^/]+/|^@x402/`,
    owners: [service('machine-payments/adapters/x402-adapter.ts')],
  },
  {
    // Stripe API. Members and Stripe use the Stripe service's client; Machine
    // Payments has its own for the API version it needs.
    dependency: npm('stripe'),
    owners: [service('stripe/stripe-api.js'), service('machine-payments/stripe/')],
  },
  {
    // oEmbed provider lookup and fetching, through a fetcher the caller passes.
    dependency: npm('@extractus/oembed-extractor'),
    owners: [service('oembed/extract-oembed.ts')],
  },

  // oEmbed and link metadata.
  {
    // Repairing JSON-LD, reading domains, decoding pages and parsing dates in
    // fetched metadata.
    dependency: [npm('jsonrepair'), npm('tldts'), npm('iconv-lite'), npm('chrono-node')].join('|'),
    owners: [service('oembed/')],
  },
  {
    // HTML entity decoding for link rewriting and fetched metadata.
    dependency: npm('entities'),
    owners: [core('server/lib/link-replacer.js'), service('oembed/')],
  },

  // File and token formats.
  {
    // CSV parsing and writing.
    dependency: npm('papaparse'),
    owners: [
      service('members/import-export/csv/'),
      service('content-import/csv/'),
      core('server/api/endpoints/utils/serializers/output/posts-csv-transform.ts'),
      core('server/data/importer/importers/data/revue-subscriber-importer.js'),
      core('server/data/importer/importers/importer-revue.js'),
      core('server/data/seeders/importers/table-importer.ts'),
    ],
  },
  {
    // Custom-field CSV columns for member import and export.
    dependency: workspace('@tryghost/metafield-csv', 'packages/metafield-csv'),
    owners: [service('members/import-export/')],
  },
  {
    // YAML redirects and routes files.
    dependency: npm('js-yaml'),
    owners: [
      service('custom-redirects/redirect-config-parser.ts'),
      service('route-settings/route-settings-parser.ts'),
      service('route-settings/yaml-parser.js'),
    ],
  },
  {
    // Signing and verifying JSON Web Tokens.
    dependency: npm('jsonwebtoken'),
    owners: [
      core('server/auth/api-key/admin.js'),
      core('server/adapters/scheduling/utils.ts'),
      core('server/api/endpoints/featurebase.js'),
      service('identity-tokens/identity-token-service.ts'),
      service('members/members-api/services/token-service.js'),
      service('tinybird/tinybird-service.js'),
    ],
  },
  {
    // One-time codes for staff two-factor sign-in and member sign-in.
    dependency: npm('otplib'),
    owners: [core('server/auth/totp.ts'), service('members/single-use-token-provider.js')],
  },

  // Content and rendering.
  {
    // Converting Mobiledoc and Lexical content.
    dependency: workspace('@tryghost/kg-converters', 'koenig/kg-converters'),
    owners: [
      core('server/models/post.js'),
      core('server/data/migrations/'),
      service('email-service/email-renderer.js'),
    ],
  },
  {
    // Sanitising untrusted HTML.
    dependency: npm('sanitize-html'),
    owners: [
      core('server/models/comment.js'),
      core('frontend/services/proxy.js'),
      core('server/data/importer/importers/json-to-html.js'),
      service('members/members-api/controllers/router-controller.js'),
      service('notifications/sanitize-notification-html.ts'),
    ],
  },
  {
    // Class names in email templates.
    dependency: npm('clsx'),
    owners: [service('email-service/email-renderer.js')],
  },
  {
    // Colour maths for email design and theme helpers.
    dependency: npm('@tryghost/color-utils'),
    owners: [
      core('server/lib/email-rendering/email-design.js'),
      core('frontend/helpers/color_to_rgba.ts'),
      core('frontend/helpers/contrast_text_color.js'),
      service('gifts/gift-email-service.ts'),
    ],
  },
  {
    // Matching URLs against route patterns.
    dependency: npm('path-match'),
    owners: [
      core('frontend/services/data/match-permalink-params.js'),
      core('server/web/api/middleware/api-version-compatibility/legacy-api-path-match.js'),
      service('url/permalink-matcher.ts'),
    ],
  },
  {
    // Comparing Ghost and import versions.
    dependency: npm('semver'),
    owners: [
      core('server/data/importer/importers/data/data-importer.js'),
      core('server/web/api/middleware/check-version-match.ts'),
      service('notifications/notifications.js'),
    ],
  },

  // Database.
  {
    // Telling SQLite from MySQL on a connection the caller passes.
    dependency: npm('@tryghost/database-info'),
    owners: [
      core('server/data/'),
      core('server/models/label.js'),
      service('jobs-service/index.ts'),
      service('members/service.js'),
      service('url/routable-resources.js'),
    ],
  },

  // One service each.
  {
    // Custom field keys and filters.
    dependency: `${npm('unidecode')}|${npm('@tryghost/mongo-knex')}`,
    owners: [service('members-metafields/')],
  },
  {
    // Cron expressions for scheduled jobs.
    dependency: npm('cron-validate'),
    owners: [service('jobs-service/jobs-service.ts')],
  },
  {
    // Filtering member events in memory.
    dependency: npm('mingo'),
    owners: [service('members/members-api/repositories/event-repository.js')],
  },
  {
    // Pacing Stripe API requests.
    dependency: npm('leaky-bucket'),
    owners: [service('stripe/stripe-api.js')],
  },
  {
    // Plan limits.
    dependency: workspace('@tryghost/limit-service', 'packages/limit-service'),
    owners: [service('limits.ts'), service('invites/index.ts')],
  },
];

// What to do about a dependency the service rule rejects, read by
// `pnpm gx services report`. The services guide states the rule. A rejected
// dependency that matches nothing here has no decision yet. Patterns match the
// dependency as the report names it: the import specifier for an external
// package, the resolved source path for anything else.
const serviceDependencyDecisions = {
  // Holds state of the running application or does its own I/O: the root wires
  // it and passes it in.
  inject: [
    '^@tryghost/logging$', // Logging.
    '^ghost/core/shared/config/', // Config.
    '^ghost/core/shared/settings-cache/', // Settings.
    '^ghost/core/server/models/index\\.js$', // Models.
    '^ghost/core/server/data/db/', // The database connection.
    '^@tryghost/domain-events$|^ghost/core/server/lib/common/events\\.js$|^ghost/core/shared/events(-ts)?/index\\.(js|ts)$', // Event buses.
    `^${servicesRoot}/`, // Other services, including the events and helpers they own.
    '^ghost/core/shared/url-utils\\.ts$', // URL utils, built from config.
    '^ghost/core/shared/labs\\.js$', // Labs flags, read from settings and config.
    '^ghost/core/shared/sentry\\.js$', // Sentry client, set up from config.
    '^ghost/core/shared/i18n/index\\.js$', // Translations for the site's locale; reads settings and locale files.
    '^@tryghost/i18n$|^packages/i18n/(src|build)/index\\.(ts|js)$', // Loads locale files.
    '^ghost/core/server/lib/tracing/index\\.ts$', // Tracing; logs.
    '^ghost/core/server/lib/request-external\\.js$', // Outbound HTTP, limited by config.
    '^got$|^@tryghost/request$', // Outbound HTTP.
    '^(node:)?dns/promises$', // DNS lookups.
    '^ghost/core/server/lib/mailgun/mailgun-client\\.js$', // Mailgun client; calls the Mailgun API and logs.
    '^ghost/core/server/lib/mail/index\\.js$', // Mailer, built from config and settings.
    '^ghost/core/server/lib/image/index\\.js$', // Image tools, built from config, storage and outbound HTTP.
    '^ghost/core/server/lib/lexical\\.js$', // Lexical renderer, wired to config, labs, settings and services.
    '^ghost/core/server/lib/get-inbox-links\\.ts$', // Logs.
    '^ghost/core/server/lib/package-json/index\\.js$', // Reads package files.
    '^@tryghost/image-transform$|^packages/image-transform/(src|build)/index\\.(ts|js)$', // Reads and writes image files.
    '^glob$|^@tryghost/zip$|^gscan$', // Read or write files.
    '^@tryghost/metrics$', // Process-wide metrics, set up from the logging config.
    '^ghost/core/server/data/schema/index\\.js$', // Reaches the database through schema commands.
    '^ghost/core/server/data/importer/(content-files|import-archive)\\.ts$', // Importer code; reads files and config.
    '^ghost/core/server/adapters/scheduling/build-signed-job\\.ts$', // Uses URL utils.
    '^ghost/core/server/adapters/storage/(utils|LocalStorageBase)\\.ts$', // Storage code; reads config, URL utils and files.
    '^ghost/core/server/api/index\\.js$|^ghost/core/server/api/endpoints/utils/(api-filter-utils\\.ts|serializers/output/utils/url\\.js)$', // The API layer and its helpers.
    '^ghost/core/server/web/shared/middleware/api/spam-prevention\\.ts$', // Rate limiting, built from config and the database.
    '^ghost/core/bridge\\.js$', // The bridge to the frontend.
  ],
  // Allowed only in another form. A specialist dependency imported outside its
  // owners is counted here too, without a pattern.
  importForm: [
    '^lodash$', // Import individual functions, such as lodash/isEmpty.
    '^(moment(-timezone)?|luxon|temporal-polyfill)$', // Dates and times go through the kernel clock, which exports moment for existing date logic.
    '^(node:)?fs(/promises)?$|^fs-extra$', // The root passes a loader limited to the files needed.
  ],
};

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
        // Specialist dependencies are checked by specialist-dependencies instead.
        pathNot: [
          ...serviceDependencyAllowlist,
          ...specialistDependencies.map(({ dependency }) => dependency),
          `^${servicesRoot}/$1/`,
        ],
        dependencyTypesNot: ['type-only', 'type-import'],
      },
    },
    ...specialistDependencies.map(({ dependency, owners }) => ({
      name: 'specialist-dependencies',
      comment:
        'Only the owners listed in specialistDependencies may import this. Use the owning code, or add the consumer to the list for review.',
      severity: 'error',
      from: { path: '^ghost/core/', pathNot: owners },
      to: { path: dependency, dependencyTypesNot: ['type-only', 'type-import'] },
    })),
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
    {
      name: 'public-apps-not-field-rules',
      comment:
        "Public UMD apps load on every page view of a site, so they draw custom fields from @tryghost/metafield-types/structure rather than loading the package root's value rules, which carry zod and libphonenumber-js. Types from the root are fine.",
      severity: 'error',
      from: {
        path: '^apps/(portal|comments-ui|signup-form|sodo-search|announcement-bar|admin-toolbar)/',
      },
      to: {
        path: '^@tryghost/metafield-types$|^packages/metafield-types/(src|build)/index\\.(ts|js)$|^libphonenumber-js($|/)|(^|/)node_modules/libphonenumber-js/',
        dependencyTypesNot: ['type-only', 'type-import'],
      },
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
    // `pnpm gx services verify` also resolves them to built output, the files Ghost
    // loads at runtime, so an allowance must hold for both.
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: [
        ...(process.env.GHOST_DEPENDENCY_RESOLUTION === 'built' ? [] : ['source']),
        'import',
        'require',
        'node',
        'default',
      ],
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
      path: [
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

// dependency-cruiser rejects configuration keys it does not know, so the
// decisions are a property its validation does not see.
Object.defineProperty(module.exports, 'serviceDependencyDecisions', {
  value: serviceDependencyDecisions,
});
