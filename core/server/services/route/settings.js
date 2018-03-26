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

let loadSettings;

// We should ALWAYS have a `routes.yaml` file available in content/settings.
// This can be a custom file, or our default. If the file is missing, we
// copy the default routes file back.
function ensureRoutesFile() {
    return fs.readFile(routesFile, 'utf8')
        .then((file) => {
            debug('Found routes file in settings folder');
            return Promise.resolve(file);
        }).catch({code: 'ENOENT'}, () => {
            // File doesn't exist, copy it from our defaults
            return fs.copy(defaultRoutesFile, routesFile).then(() => {
                return fs.readFile(routesFile, 'utf8');
            }).then((file) => {
                debug('Default routes file copied');
                return Promise.resolve(file);
            }).catch((err) => {
                // the default routes file doesn't exist 😱, or we can't access
                // the content/settings folder. Now we have the salad
                // TODO: what error do we want to return here
                return Promise.reject(new common.errors.GhostError({
                    message: 'Error trying to copy the default routes file.',
                    err: err,
                    context: err.path
                }));
            });
        }).catch((error) => {
            if (common.errors.utils.isIgnitionError(error)) {
                return Promise.reject(error);
            }
            // TODO: what error do we want to return here
            return Promise.reject(new common.errors.GhostError({
                message: 'Error trying to access routes files in content/settings',
                err: error,
                context: error.path
            }));
        });
}

loadSettings = function loadSettings() {
    return ensureRoutesFile().then((yamlFile) => {
        try {
            const routes = yaml.safeLoad(yamlFile);

            return Promise.resolve(routes);
        } catch (err) {
            // Parsing failed, `js-yaml` tells us exactly what and where in the
            // `reason` property as well as in the message.
            return Promise.reject(new common.errors.IncorrectUsageError({
                message: common.i18n.t('errors.services.route.settings.error', {context: err.reason}),
                context: err.message,
                err: err,
                help: common.i18n.t('errors.services.route.settings.help')
            }));
        }
    }).catch((error) => {
        return Promise.reject(error);
    });
};

module.exports = loadSettings;
