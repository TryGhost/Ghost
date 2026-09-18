const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

// Built as a new object rather than by mutating what config handed back. Config
// is frozen once loaded, and this file is a plain CommonJS module body — sloppy
// mode — so writes to a frozen object here fail *silently* rather than throwing.
// Mutating in place left logging with none of its configuration and no error.
const loggingConfig = { ...(config.get('logging') || {}) };

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
loggingConfig.metrics = {
  ...(config.get('logging:metrics') || {}),
  metadata: {
    // Undefined if unavailable
    siteId: config.get('hostSettings:siteId'),
    domain: config.get('url'),
    version: ghostVersion.original,
  },
};

module.exports = loggingConfig;
