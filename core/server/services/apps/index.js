const debug = require('ghost-ignition').debug('services:apps');
const Promise = require('bluebird');
const common = require('../../lib/common');
const config = require('../../config');
const loader = require('./loader');
const internalApps = config.get('apps:internal');

module.exports = {
    init: function () {
        debug('init begin');
        const appsToLoad = internalApps;

        return Promise.map(appsToLoad, appName => loader.activateAppByName(appName))
            .catch(function (err) {
                common.logging.error(new common.errors.GhostError({
                    err: err,
                    context: common.i18n.t('errors.apps.appWillNotBeLoaded.error'),
                    help: common.i18n.t('errors.apps.appWillNotBeLoaded.help')
                }));
            });
    }
};
