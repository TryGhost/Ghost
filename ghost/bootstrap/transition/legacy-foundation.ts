import type { Foundation } from '#kernel/foundation';
import { legacyEventBus } from './legacy-events';

/**
 * EARMARKED. Hands the application the config, logger, database handle and event bus that legacy
 * code builds for itself on import, so that code handed the foundation and code that imports
 * them share one of each. Each is looked up when first read: this file loads none of them.
 *
 * It exists because those modules build themselves. It leaves when the foundry builds the
 * foundation from Ghost's values and the legacy import paths return what it built.
 */
export function legacyFoundation(): Foundation {
  return {
    get config() {
      return require('../../core/shared/config');
    },
    get logger() {
      return require('@tryghost/logging');
    },
    get database() {
      return require('../../core/server/data/db').knex;
    },
    events: legacyEventBus(),
    clock: { now: () => Date.now() },
  };
}
