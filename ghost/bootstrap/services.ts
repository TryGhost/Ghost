import type { Declared, Entry } from '@tryghost/foundry/application';
import { legacySteps, type BootRun } from './transition/legacy-steps';

// Whether this process does the work of the worker role. Every Ghost process
// does today; see BootOptions.
const worker = ({ options }: BootRun) => options.worker;

/**
 * Service definitions that declare listeners. The framework attaches the
 * listeners when the services step begins and builds nothing: each service is
 * built the first time it is used or one of its events arrives. The order
 * means nothing.
 *
 * A definition with nothing to declare is not listed anywhere. It is built the
 * first time it is used.
 */
export const declared: readonly Declared[] = [
  { name: 'staff', load: () => require('../core/server/services/staff').default },
  { name: 'tags-public', load: () => require('../core/server/services/tags-public').default },
  { name: 'posts-public', load: () => require('../core/server/services/posts-public').default },
];

/**
 * What the services step starts, in this order, one after another. The
 * framework calls `init()` on each service root and, when Ghost stops,
 * `stop()` on each in reverse.
 *
 * An entry names its root without loading it: `load` is called when the step
 * reaches the entry. A root that holds its own instance (the older form of
 * `defineService`) is one line here and nothing anywhere else.
 *
 * A service definition (see the services guide in
 * `core/server/services/README.md`) is listed here only when boot has to
 * build it: it declares a `start`, or it is built asynchronously and read by
 * code that cannot wait. The framework builds it at its place in the list.
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
  // Built here because it is built asynchronously and the code that reads it
  // cannot wait. Under legacy nothing loads Better Auth itself.
  {
    name: 'better-auth',
    when: () => require('../core/server/auth').isBetterAuth,
    load: () => require('../core/server/auth').betterAuth,
  },
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
  { name: 'tiers', load: () => require('../core/server/services/tiers').default },
  { name: 'indexnow-ping', load: () => require('../core/server/services/indexnow-ping').default },
  { name: 'upgrades', load: () => require('../core/server/services/upgrades').default },
  { name: 'slack-ping', load: () => require('../core/server/services/slack-ping').default },
  { name: 'comments', load: () => require('../core/server/services/comments').default },
  { name: 'media-inliner', load: () => require('../core/server/services/media-inliner').default },
  {
    name: 'recommendations',
    load: () => require('../core/server/services/recommendations').default,
  },
  // Its start pings Explore, which is work of the worker role. Nothing reads the service.
  {
    name: 'explore-ping',
    when: worker,
    load: () => require('../core/server/services/explore-ping').default,
  },
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
