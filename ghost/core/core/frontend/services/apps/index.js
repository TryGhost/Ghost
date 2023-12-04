const debug = require('@tryghost/debug')('services:apps');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const loader = require('./loader');

const messages = {
    appWillNotBeLoadedError: 'The app will not be loaded',
    appWillNotBeLoadedHelp: 'Check with the app creator, or read the app documentation for more details on app requirements'
};

module.exports = {
    init: function () {
        debug('init begin');
        const appsToLoad = config.get('apps:internal');
        const appPromises = appsToLoad.map(appName => loader.activateAppByName(appName));
        return Promise.all(appPromises)
            .catch(function (err) {
                logging.error(new errors.InternalServerError({
                    err: err,
                    context: tpl(messages.appWillNotBeLoadedError),
                    help: tpl(messages.appWillNotBeLoadedHelp)
                }));
            });
    }
};
