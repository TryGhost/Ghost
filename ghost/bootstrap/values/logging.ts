import type { Config } from '#kernel/foundation';

/** What Ghost's config answers besides `get`, as far as these values need it. */
interface GhostConfig extends Config {
  getContentPath(name: string): string;
}

/**
 * The values Ghost's logger and metrics are built from: the `logging` section of config, with
 * where logs are written and what every line is tagged with.
 *
 * Returns an object of its own that the caller may write to: config is read-only.
 */
export function loggingValues(config: Config): Record<string, any> {
  const _: typeof import('lodash') = require('lodash');
  const ghostVersion: { original: string } = require('@tryghost/version');

  const values: Record<string, any> = _.cloneDeep(config.get('logging')) || {};
  if (!values.path) {
    values.path = (config as GhostConfig).getContentPath('logs');
  }

  // Additional values used by logging
  values.env = config.get('env');
  values.domain = config.get('url');
  values.metadata = {
    version: ghostVersion.original,
  };

  // Metrics is configured under logging
  values.metrics = _.cloneDeep(config.get('logging:metrics')) || {};
  values.metrics.metadata = {
    // Undefined if unavailable
    siteId: config.get('hostSettings:siteId'),
    domain: config.get('url'),
    version: ghostVersion.original,
  };

  return values;
}
