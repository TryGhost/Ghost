'use-scrict';

const yaml = require('js-yaml'),
    fs = require('fs-extra'),
    path = require('path'),
    debug = require('ghost-ignition').debug('settings'),
    common = require('../../lib/common'),
    config = require('../../config'),
    // @TODO: move to settings service
    routesFile = path.join(config.getContentPath('settings'), 'routes.yaml'),
    defaultRoutesFile = path.join(config.get('paths').defaultRoutes, 'default-routes.yaml');

// TODO:
// 1. make sure default `routes.yaml` in settings folder exists. If not, create it.
// 2. read in the `routes.yaml` file
// 3. no cache for now

// We should ALWAYS have a `routes.yaml` file available in content/settings.
// This can be a custom file, or our default. If the file is missing, we
// copy the default routes file back.
function ensureRoutesFile() {
    try {
        fs.statSync(routesFile);
        debug('routes.yaml file found');
        return true;
    } catch (e) {
        // Only throw an error when it's not expected
        if (e.code !== 'ENOENT') {
            throw new common.errors.GhostError({
                err: e
            });
        }
        debug('no routes.yaml file found');
        // File doesn't exist, copy it from our defaults
        try {
            fs.copySync(defaultRoutesFile, routesFile);
            debug('default route file copied');
            return true;
        } catch (err) {
            // the default routes file doesn't exist 😱
            // now we have the salad
            throw new common.errors.GhostError({
                err: err
            });
        }
    }
}

function loadSettings() {
    try {
        ensureRoutesFile();
        try {
            const routes = yaml.safeLoad(fs.readFileSync(routesFile, 'utf8'));
            debug('read', routes);

            return routes;
        } catch (err) {
            throw new common.errors.IncorrectUsageError({
                message: common.i18n.t('errors.services.route.settings.error', {context: err.message}),
                err: err,
                context: err.message,
                help: common.i18n.t('errors.services.route.settings.help')
            });
        }
    } catch (e) {
        debug('Error logged:', e);
        common.logging.error(e);
    }
}

module.exports = loadSettings();
