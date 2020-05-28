const {events, i18n} = require('../../../server/lib/common');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const active = require('./active');

function activate(loadedTheme, checkedTheme, error) {
    // no need to check the score, activation should be used in combination with validate.check
    // Use the two theme objects to set the current active theme
    try {
        let previousGhostAPI;

        if (active.get()) {
            previousGhostAPI = active.get().engine('ghost-api');
        }

        active.set(loadedTheme, checkedTheme, error);
        const currentGhostAPI = active.get().engine('ghost-api');

        events.emit('services.themes.activated');

        if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
            events.emit('services.themes.api.changed');
            const siteApp = require('../../../server/web/site/app');
            siteApp.reload();
        }
    } catch (err) {
        logging.error(new errors.InternalServerError({
            message: i18n.t('errors.middleware.themehandler.activateFailed', {theme: loadedTheme.name}),
            err: err
        }));
    }
}

module.exports = activate;
