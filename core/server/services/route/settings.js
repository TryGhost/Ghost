var yaml = require('js-yaml'),
    fs = require('fs-extra'),
    path = require('path'),
    debug = require('ghost-ignition').debug('settings'),
    config = require('../../config'),
    // @TODO: move to settings service
    routesFile = path.join(config.getContentPath('settings'), 'routes.yaml'),
    _private = {},
    cache;

_private.loadSettings = function () {
    try {
        debug('routesFile');
        var stats = fs.statSync(routesFile);
        debug('got stats', stats);

        // If the file hasn't changed
        if (cache && cache.mtime && cache.mtime === stats.mtime) {
            debug('returning cached');
            return cache;
        }

        debug('reading');
        cache = yaml.safeLoad(fs.readFileSync(routesFile, 'utf8'));
        cache.mtime = stats.mtime;
        debug('read', cache);

        return cache;
    } catch (e) {
        // TODO: Write file from default-routes.yaml if it doesn't exist
        console.log('read err', e);
    }
};

module.exports = _private.loadSettings();
