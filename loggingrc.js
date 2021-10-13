const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

module.exports = {
    name: config.get('logging:name'),
    env: config.get('env'),
    path: config.get('logging:path') || config.getContentPath('logs'),
    domain: config.get('url'),
    mode: config.get('logging:mode'),
    level: config.get('logging:level'),
    transports: config.get('logging:transports'),
    metrics: {
        transports: config.get('logging:metrics:transports'),
        metadata: {
            // Undefined if unavailable
            siteId: config.get('hostSettings:siteId'),
            domain: config.get('url'),
            version: ghostVersion.safe
        }
    },
    gelf: config.get('logging:gelf'),
    loggly: config.get('logging:loggly'),
    elasticsearch: config.get('logging:elasticsearch'),
    rotation: config.get('logging:rotation')
};
