import type { Entry } from '@tryghost/foundry/application';
import { legacySteps, type BootRun } from './transition/legacy-steps';

/**
 * What the shared step starts, in this order, one after another: the modules
 * every service may rely on. They start after the database is ready and
 * before any service.
 *
 * The framework hands each module the foundation and the instances of the
 * earlier entries it names in `needs`. A shared module imports neither.
 *
 * The order is real. Settings reads limits while it starts (the
 * `publicSiteAccess` limit decides whether the site is made private), and
 * signing keys and i18n read settings.
 *
 * The entries that call `legacySteps` are shared modules that are not shaped
 * as one yet: each is still started by a function of `core/boot.js`. They are
 * transitional and become one line here as each is reshaped into
 * `ghost/shared/<name>/`. An entry that loads from `ghost/shared/transition/`
 * is transitional too: it is listed by hand, like everything in a transition
 * folder.
 */
export const shared: readonly Entry<BootRun>[] = [
  // Built from config alone. It is here so its load time is visible on its own.
  { name: 'legacy: url utils', run: legacySteps.urlUtils },
  { name: 'limits', load: () => require('../shared/limits').default },
  // What settings still takes from legacy Core: the model, the cache, the cache
  // adapter and the calculated settings. Transitional; it starts nothing.
  {
    name: 'settings-transition',
    load: () => require('../shared/transition/settings').default,
  },
  {
    name: 'settings',
    load: () => require('../shared/settings').default,
    needs: ['limits', 'settings-transition'],
  },
  // Signing keys come from settings and must be ready before anything signs or serves a JWKS.
  { name: 'signing-keys', load: () => require('../core/server/services/signing-keys').default },
  { name: 'internal-keys', load: () => require('../core/server/services/internal-keys').default },
  { name: 'legacy: i18n', run: legacySteps.i18n },
  // Mail cannot send without it, and mail is shared.
  { name: 'legacy: email address policy', run: legacySteps.emailAddressPolicy },
];
