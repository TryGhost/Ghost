import cloneDeep from 'lodash/cloneDeep';
import type { LoggerOptions } from '#foundry/logging';

const ghostVersion: { original: string } = require('@tryghost/version');

/** The part of Ghost's config these options are worked out from. */
interface Config {
  get(key: string): any;
  getContentPath(name: string): string;
}

/**
 * Ghost's logging options, worked out from Ghost's config: where logs are
 * written and what every line is tagged with. `loggingrc.js` returns the same
 * object to the packages that still read that file, which is why the metrics
 * options ride along.
 *
 * A deep clone, because everything below writes into it and config is
 * read-only. `@tryghost/logging` also assigns `transports` itself in a worker
 * thread, so what is handed back must be mutable.
 */
export function loggingOptions(config: Config): LoggerOptions & { metrics: Record<string, any> } {
  const options = cloneDeep(config.get('logging')) || {};

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
  options.metrics = cloneDeep(config.get('logging:metrics')) || {};
  options.metrics.metadata = {
    // Undefined if unavailable
    siteId: config.get('hostSettings:siteId'),
    domain: config.get('url'),
    version: ghostVersion.original,
  };

  return options;
}
