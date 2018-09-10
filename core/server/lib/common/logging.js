const config = require('../../config'),
    {logging} = require('ghost-ignition');

module.exports = logging({
    env: config.get('env'),
    path: config.get('logging:path') || config.getContentPath('logs'),
    domain: config.get('url'),
    mode: config.get('logging:mode'),
    level: config.get('logging:level'),
    transports: config.get('logging:transports'),
    loggly: config.get('logging:loggly'),
    rotation: config.get('logging:rotation')
});
