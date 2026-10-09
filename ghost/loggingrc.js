const _ = require('lodash');
const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

// Config for logging.
//
// A deep clone, because everything below writes into it, and config is
// read-only. @tryghost/logging require()s this file inside a try/catch and
// falls back to {} on a throw, so mutating config's own object here would
// silently drop the whole configuration - in production that means the
// configured transports are replaced by the defaults. It also assigns
// `transports` itself for worker threads, so what we hand back must be mutable.
const loggingConfig = _.cloneDeep(config.get('logging')) || {};

if (!loggingConfig.path) {
  loggingConfig.path = config.getContentPath('logs');
}

// Additional values used by logging
loggingConfig.env = config.get('env');
loggingConfig.domain = config.get('url');
loggingConfig.metadata = {
  version: ghostVersion.original,
};

// Config for metrics
loggingConfig.metrics = _.cloneDeep(config.get('logging:metrics')) || {};
loggingConfig.metrics.metadata = {
  // Undefined if unavailable
  siteId: config.get('hostSettings:siteId'),
  domain: config.get('url'),
  version: ghostVersion.original,
};

module.exports = loggingConfig;
