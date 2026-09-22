import { z } from 'zod';
import { markLoose, todo } from './ratchet';
import { envSchema } from './sections/env';
import { urlSchema } from './sections/url';

/**
 * The shape of Ghost's config, as loaded by ./loader.ts.
 *
 * Every top-level key Ghost ships or reads is listed here. Keys are introduced
 * as `todo()` - accept anything, infer as `any` - and are ratcheted one at a
 * time by swapping in a real schema from ./sections. The list of outstanding
 * `todo()`s is pinned in ./ratchet-allowlist.ts and asserted exactly, so a
 * section can neither be added without review nor regress once ratcheted.
 *
 * Two rules keep the ratchet safe to land incrementally:
 *
 * 1. Sections validate and narrow, they never transform. `z.object()` strips
 *    unknown keys and `z.coerce` rewrites values - both would silently change
 *    config Ghost already runs on. Use `looseSection()` from ./ratchet and
 *    plain validators, and let the round-trip test in the unit suite prove it.
 * 2. Nothing here may be stricter than what the loader already enforced.
 *    Tightening beyond that is its own change, with its own release note.
 */
export const configSchema = markLoose(
  z.looseObject({
    adapters: todo(),
    admin: todo(),
    adminFrameProtection: todo(),
    adminToolbar: todo(),
    announcementBar: todo(),
    apps: todo(),
    automations: todo(),
    backgroundJobs: todo(),
    'bootstrap-socket': todo(),
    bulkEmail: todo(),
    cacheMembersContent: todo(),
    caching: todo(),
    client_sentry: todo(),
    clientExtensions: todo(),
    comments: todo(),
    compress: todo(),
    database: todo(),
    disableJSBackups: todo(),
    disableMigrationBackups: todo(),
    docsbot: todo(),
    emailAnalytics: todo(),
    enableDeveloperExperiments: todo(),
    enableStripePromoCodes: todo(),
    enableTipsAndDonations: todo(),
    env: envSchema,
    explore: todo(),
    externalRequest: todo(),
    featurebase: todo(),
    gravatar: todo(),
    hostSettings: todo(),
    imageOptimization: todo(),
    klipy: todo(),
    labs: todo(),
    linkClickTrackingCacheMemberUuid: todo(),
    logging: todo(),
    machinePayments: todo(),
    mail: todo(),
    maintenance: todo(),
    members: todo(),
    metrics_server: todo(),
    milestones: todo(),
    notificationGroups: todo(),
    opensea: todo(),
    optimization: todo(),
    paths: todo(),
    pintura: todo(),
    portal: todo(),
    preloadHeaders: todo(),
    privacy: todo(),
    PRO_ENV: todo(),
    prometheus: todo(),
    queryParameterFiltering: todo(),
    referrerPolicy: todo(),
    remoteFlags: todo(),
    scheduling: todo(),
    security: todo(),
    sendWelcomeEmail: todo(),
    sentry: todo(),
    server: todo(),
    services: todo(),
    signupForm: todo(),
    site_uuid: todo(),
    slugs: todo(),
    sodoSearch: todo(),
    spam: todo(),
    storage: todo(),
    STRIPE_API_HOST: todo(),
    STRIPE_API_PORT: todo(),
    STRIPE_API_PROTOCOL: todo(),
    stripeDirect: todo(),
    stripeRemoteWebhooks: todo(),
    stripeWebhookCustomerIgnoreList: todo(),
    stripeWebhookUrl: todo(),
    theme: todo(),
    times: todo(),
    tinybird: todo(),
    twitter: todo(),
    updateCheck: todo(),
    uploadClear: todo(),
    uploads: todo(),
    url: urlSchema,
    urls: todo(),
    useMinFiles: todo(),
    usingLoopbackReverseProxy: todo(),
    verifyRequestIntegrity: todo(),
  }),
  'top level accepts unknown keys until every key Ghost reads is listed',
);

export type Config = z.infer<typeof configSchema>;
