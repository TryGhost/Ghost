const common = require('../../../server/lib/common');
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

        common.events.emit('services.themes.activated');

        if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
            common.events.emit('services.themes.api.changed');
            const siteApp = require('../../../server/web/site/app');
            siteApp.reload();
        }
    } catch (err) {
        common.logging.error(new common.errors.InternalServerError({
            message: common.i18n.t('errors.middleware.themehandler.activateFailed', {theme: loadedTheme.name}),
            err: err
        }));
    }
}

module.exports = activate;
