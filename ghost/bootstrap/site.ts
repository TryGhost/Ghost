/**
 * Ghost runs one site per process, so there is one Site. It is made here from the
 * modules that legacy code imports directly, so old and new code share them.
 *
 * Only the places that call into new code may import it: boot, for listeners, and
 * the API layer, for endpoints. Everything else is handed the site.
 */
import type { Site } from '#support/site';
import { events } from './events';

export const site: Site = Object.freeze({
  // Every site has a site_uuid setting, seeded when its database is created.
  get id() {
    const id = require('../core/shared/settings-cache').get('site_uuid');
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('The site id was read before settings were loaded.');
    }
    return id;
  },
  get config() {
    return require('../core/shared/config');
  },
  get log() {
    return require('@tryghost/logging');
  },
  events,
});
