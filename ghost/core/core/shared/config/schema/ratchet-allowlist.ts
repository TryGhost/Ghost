import { ROOT } from './ratchet';

/**
 * The two ratchet axes, pinned.
 *
 * The unit suite asserts each list matches the schema *exactly*, in both
 * directions. Adding an entry needs a deliberate edit that shows up in review;
 * ratcheting one away forces the line to be deleted in the same change, so a
 * section can never quietly regress to `todo()` or back to loose.
 *
 * Neither list may ever grow for an existing key. Both should only shrink.
 */

/** Top-level sections that still accept anything (see `todo()`). */
export const TODO_ALLOWLIST: readonly string[] = [
  'adapters',
  'admin',
  'adminFrameProtection',
  'adminToolbar',
  'announcementBar',
  'apps',
  'automations',
  'backgroundJobs',
  'bootstrap-socket',
  'bulkEmail',
  'cacheMembersContent',
  'caching',
  'client_sentry',
  'clientExtensions',
  'comments',
  'compress',
  'database',
  'disableJSBackups',
  'disableMigrationBackups',
  'docsbot',
  'emailAnalytics',
  'enableDeveloperExperiments',
  'enableStripePromoCodes',
  'enableTipsAndDonations',
  'explore',
  'externalRequest',
  'featurebase',
  'gravatar',
  'hostSettings',
  'imageOptimization',
  'klipy',
  'labs',
  'linkClickTrackingCacheMemberUuid',
  'logging',
  'machinePayments',
  'mail',
  'maintenance',
  'members',
  'metrics_server',
  'milestones',
  'notificationGroups',
  'opensea',
  'optimization',
  'paths',
  'pintura',
  'portal',
  'preloadHeaders',
  'privacy',
  'PRO_ENV',
  'prometheus',
  'queryParameterFiltering',
  'referrerPolicy',
  'remoteFlags',
  'scheduling',
  'security',
  'sendWelcomeEmail',
  'sentry',
  'server',
  'services',
  'signupForm',
  'site_uuid',
  'slugs',
  'sodoSearch',
  'spam',
  'storage',
  'STRIPE_API_HOST',
  'STRIPE_API_PORT',
  'STRIPE_API_PROTOCOL',
  'stripeDirect',
  'stripeRemoteWebhooks',
  'stripeWebhookCustomerIgnoreList',
  'stripeWebhookUrl',
  'theme',
  'times',
  'tinybird',
  'twitter',
  'updateCheck',
  'uploadClear',
  'uploads',
  'urls',
  'useMinFiles',
  'usingLoopbackReverseProxy',
  'verifyRequestIntegrity',
];

/**
 * Ratcheted sections that still accept unknown keys (see `looseSection()`).
 *
 * The root stays loose until every key Ghost reads is enumerated in the schema
 * - closing it is what turns a typo in a self-hoster's config.production.json
 * into an error instead of a silently ignored key.
 */
export const LOOSE_ALLOWLIST: readonly string[] = [ROOT];
