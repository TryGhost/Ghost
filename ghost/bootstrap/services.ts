import type { Entry } from '@tryghost/foundry/application';
import { legacySteps, type BootRun } from './transition/legacy-steps';

/**
 * What the services step starts, in this order, one after another. The
 * framework calls `init()` on each service root and, when Ghost stops,
 * `stop()` on each in reverse.
 *
 * An entry names its root without loading it: `load` is called when the step
 * reaches the entry. A standard service (see the services guide in
 * `core/server/services/README.md`) is one line here and nothing anywhere
 * else.
 *
 * The entries that call `legacySteps` are legacy initializers that still sit
 * between services: each needs something boot makes, or has no `init()` the
 * framework can call. They are transitional and leave this list as their
 * services become standard. The order around them is real; the comments say
 * what depends on what.
 *
 * Eventually this step starts domains, and this list becomes the domains.
 */
export const services: readonly Entry<BootRun>[] = [
  // Reads admin_session_secret, so it follows settings. Under legacy nothing
  // loads Better Auth itself.
  {
    name: 'better-auth',
    when: () => require('../core/server/auth').isBetterAuth,
    load: () => require('../core/server/auth').betterAuth,
  },
  { name: 'gift-links', load: () => require('../core/server/services/gift-links').default },
  // Stripe checkout config and tiers read member metafields while they start.
  { name: 'legacy: members metafields', run: legacySteps.membersMetafields },
  {
    name: 'app-installations',
    load: () => require('../core/server/services/app-installations').default,
  },
  {
    name: 'export-requests',
    load: () => require('../core/server/services/export-requests').default,
  },
  { name: 'invites', load: () => require('../core/server/services/invites').default },
  { name: 'integrations', load: () => require('../core/server/services/integrations').default },
  {
    name: 'stripe-checkout-config',
    load: () => require('../core/server/services/stripe-checkout-config').default,
  },
  { name: 'legacy: jobs cleanup', run: legacySteps.jobsCleanup },
  // After the services above, which is where the pool was instrumented before
  // services started from this list.
  { name: 'legacy: knex instrumentation', run: legacySteps.knexInstrumentation },

  // What the frontend reads while its Express app is built.
  { name: 'legacy: routing services', run: legacySteps.routingServices },
  {
    name: 'link-redirection',
    load: () => require('../core/server/services/link-redirection').default,
  },
  // Custom theme settings must be ready before any theme is activated.
  {
    name: 'custom-theme-settings',
    load: () => require('../core/server/services/custom-theme-settings').default,
  },
  { name: 'legacy: themes', run: legacySteps.themes },
  {
    name: 'legacy: frontend',
    when: ({ options }) => options.frontend,
    run: legacySteps.frontend,
  },
  { name: 'legacy: express apps', run: legacySteps.expressApps },
  { name: 'legacy: dynamic routing', run: legacySteps.dynamicRouting },
  {
    name: 'legacy: app service',
    when: ({ options }) => options.frontend,
    run: legacySteps.appService,
  },
  { name: 'legacy: jobs service', run: legacySteps.jobsService },

  // The email address policy, the scheduler, Stripe and gifts.
  { name: 'legacy: services first', run: legacySteps.legacyServicesFirst },
  {
    name: 'member-attribution',
    load: () => require('../core/server/services/member-attribution').default,
  },
  // Email captures Audience Feedback's ready link service while it starts.
  {
    name: 'audience-feedback',
    load: () => require('../core/server/services/audience-feedback').default,
  },
  // Members captures the ready Newsletters instance while it starts.
  { name: 'newsletters', load: () => require('../core/server/services/newsletters').default },
  // Recommendations reads the ready Mentions instance while it starts, and
  // webhooks listen after Mentions.
  { name: 'mentions', load: () => require('../core/server/services/mentions').default },
  // Explore captures the ready Stats aggregate while it starts.
  { name: 'stats', load: () => require('../core/server/services/stats').default },
  // Identity tokens, members, members events, the email service, email
  // analytics, webhooks, link tracking, the email suppression list, content
  // import and machine payments, started together.
  { name: 'legacy: services', run: legacySteps.legacyServices },
  { name: 'staff', load: () => require('../core/server/services/staff').default },
  { name: 'tiers', load: () => require('../core/server/services/tiers').default },
  { name: 'tags-public', load: () => require('../core/server/services/tags-public').default },
  { name: 'posts-public', load: () => require('../core/server/services/posts-public').default },
  { name: 'indexnow-ping', load: () => require('../core/server/services/indexnow-ping').default },
  { name: 'upgrades', load: () => require('../core/server/services/upgrades').default },
  { name: 'slack-ping', load: () => require('../core/server/services/slack-ping').default },
  { name: 'comments', load: () => require('../core/server/services/comments').default },
  { name: 'media-inliner', load: () => require('../core/server/services/media-inliner').default },
  { name: 'donations', load: () => require('../core/server/services/donations').default },
  {
    name: 'recommendations',
    load: () => require('../core/server/services/recommendations').default,
  },
  { name: 'explore-ping', load: () => require('../core/server/services/explore-ping').default },
  { name: 'users', load: () => require('../core/server/services/users').default },
  {
    name: 'editor-presence',
    load: () => require('../core/server/services/editor-presence').default,
  },
  { name: 'segments', load: () => require('../core/server/services/segments').default },
  // Captures the ready Email address and Link tracking instances while it
  // starts, and automation polling sends through it once jobs start.
  {
    name: 'member-welcome-emails',
    load: () => require('../core/server/services/member-welcome-emails').default,
  },
];
