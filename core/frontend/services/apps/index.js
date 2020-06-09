const debug = require('ghost-ignition').debug('services:apps');
const Promise = require('bluebird');
const {i18n} = require('../../../server/lib/common');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const loader = require('./loader');

module.exports = {
    init: function () {
        debug('init begin');
        const appsToLoad = config.get('apps:internal');

        return Promise.map(appsToLoad, appName => loader.activateAppByName(appName))
            .catch(function (err) {
                logging.error(new errors.GhostError({
                    err: err,
                    context: i18n.t('errors.apps.appWillNotBeLoaded.error'),
                    help: i18n.t('errors.apps.appWillNotBeLoaded.help')
                }));
            });
    }
};
