var config = require('../config'),
    GhostLogger = require('./GhostLogger'),
    adapter = new GhostLogger({
        env: config.get('env'),
        mode: process.env.NODE_MODE || config.get('logging:mode'),
        level: process.env.NODE_LEVEL || config.get('logging:level'),
        transports: config.get('logging:transports'),
        rotation: config.get('logging:rotation'),
        path: config.get('paths:appRoot') + '/ghost.log'
    });

module.exports = adapter;
