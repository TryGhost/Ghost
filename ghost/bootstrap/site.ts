/**
 * Ghost runs one site per process, so there is one Site. It is made here from the
 * modules that legacy code imports directly, so old and new code share them.
 *
 * Only the places that call into new code may import it: boot, for listeners, and
 * the API layer, for endpoints. Everything else is handed the site.
 */
import type { Site } from '#support/site';

export const site: Site = Object.freeze({
  get config() {
    return require('../core/shared/config');
  },
  get log() {
    return require('@tryghost/logging');
  },
  get events() {
    return require('../core/server/lib/common/events');
  },
});
