const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

// Config for logging
const loggingConfig = config.get('logging') || {};

if (!loggingConfig.path) {
    loggingConfig.path = config.getContentPath('logs');
}

// Additional values used by logging
loggingConfig.env = config.get('env');
loggingConfig.domain = config.get('url');
loggingConfig.metadata = {
    version: ghostVersion.original
};

// Config for metrics
loggingConfig.metrics = config.get('logging:metrics') || {};
loggingConfig.metrics.metadata = {
    // Undefined if unavailable
    siteId: config.get('hostSettings:siteId'),
    domain: config.get('url'),
    version: ghostVersion.original
};

module.exports = loggingConfig;
