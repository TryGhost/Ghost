/**
 * The Bridge
 *
 * The bridge is responsible for handing communication from the server to the frontend.
 * Data should only be flowing server -> frontend.
 * As the architecture improves, the number of cross requires here should go down
 * Eventually, the aim is to make this a component that is initialised on boot and is either handed to or actively creates the frontend, if the frontend is desired.
 *
 * This file is a great place for all the cross-component event handling in lieu of refactoring
 */

const debug = require('@tryghost/debug')('bridge');
const errors = require('@tryghost/errors');
const config = require('./shared/config');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const themeEngine = require('./frontend/services/theme-engine');
const settingsCache = require('./shared/settings-cache');

// Listen to settings.lang.edited, similar to the member service and models/base/listeners
const events = require('./server/lib/common/events');

const messages = {
    activateFailed: 'Unable to activate the theme "{theme}".'
};

class Bridge {
    constructor() {
        /**
         * When locale changes, we reload theme translations
         * @deprecated: the term "lang" was deprecated in favor of "locale" publicly in 4.0
         */
        events.on('settings.lang.edited', (model) => {
            debug('Active theme init18n');
            this.getActiveTheme().initI18n({locale: model.get('value')});
        });
    }

    getActiveTheme() {
        return themeEngine.getActive();
    }

    activateTheme(loadedTheme, checkedTheme, error) {
        let settings = {
            locale: settingsCache.get('lang')
        };
        // no need to check the score, activation should be used in combination with validate.check
        // Use the two theme objects to set the current active theme
        try {
            let previousGhostAPI;

            if (this.getActiveTheme()) {
                previousGhostAPI = this.getActiveTheme().engine('ghost-api');
            }

            themeEngine.setActive(settings, loadedTheme, checkedTheme, error);
            const currentGhostAPI = this.getActiveTheme().engine('ghost-api');

            if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
                events.emit('services.themes.api.changed');
                this.reloadFrontend();
            }
        } catch (err) {
            logging.error(new errors.InternalServerError({
                message: tpl(messages.activateFailed, {theme: loadedTheme.name}),
                err: err
            }));
        }
    }

    getFrontendApiVersion() {
        if (this.getActiveTheme()) {
            return this.getActiveTheme().engine('ghost-api');
        } else {
            return config.get('api:versions:default');
        }
    }

    reloadFrontend() {
        const apiVersion = this.getFrontendApiVersion();
        debug('reload frontend', apiVersion);
        const siteApp = require('./server/web/site/app');
        siteApp.reload({apiVersion});
    }
}

const bridge = new Bridge();

module.exports = bridge;
