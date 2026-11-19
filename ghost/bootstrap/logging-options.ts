import _ from 'lodash';
import type { LoggerOptions } from '@tryghost/kernel/logging';
import type { GhostConfig } from '../core/shared/config/validated';

const ghostVersion: { original: string } = require('@tryghost/version');

/**
 * The options Ghost's logger and metrics are built from, worked out from
 * config. The application builds its logger from these; `loggingrc.js` returns
 * the same thing to the packages that still read that file themselves
 * (`@tryghost/metrics`, and `@tryghost/logging` in a worker thread or when it
 * is loaded before the application is).
 *
 * A deep clone, because everything below writes into it and config is
 * read-only. `@tryghost/logging` also assigns `transports` itself for worker
 * threads, so what is handed back must be mutable.
 */
export function loggingOptions(config: GhostConfig): LoggerOptions & Record<string, unknown> {
  const options: Record<string, any> = _.cloneDeep(config.get('logging')) || {};

  if (!options.path) {
    options.path = config.getContentPath('logs');
  }

  // Additional values used by logging
  options.env = config.get('env');
  options.domain = config.get('url');
  options.metadata = {
    version: ghostVersion.original,
  };

  // Config for metrics
  options.metrics = _.cloneDeep(config.get('logging:metrics')) || {};
  options.metrics.metadata = {
    // Undefined if unavailable
    siteId: config.get('hostSettings:siteId'),
    domain: config.get('url'),
    version: ghostVersion.original,
  };

  return options;
}
