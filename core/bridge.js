/**
 * The Bridge
 *
 * The bridge is responsible for handing communication from the server to the frontend.
 * Data should only be flowing server -> frontend.
 * As the architecture improves, the number of cross requires here should go down
 * Eventually, the aim is to make this a component that is initialized on boot and is either handed to or actively creates the frontend, if the frontend is desired.
 *
 * This file is a great place for all the cross-component event handling in lieu of refactoring
 * NOTE: You may require anything from shared, the frontend or server here - it is the one place (other than boot) that is allowed :)
 */

const debug = require('@tryghost/debug')('bridge');
const errors = require('@tryghost/errors');
const config = require('./shared/config');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const themeEngine = require('./frontend/services/theme-engine');
const cardAssetService = require('./frontend/services/card-assets');
const routerManager = require('./frontend/services/routing').routerManager;
const settingsCache = require('./shared/settings-cache');

// Listen to settings.lang.edited, similar to the member service and models/base/listeners
const events = require('./server/lib/common/events');

const messages = {
    activateFailed: 'Unable to activate the theme "{theme}".'
};

class Bridge {
    init() {
        /**
         * When locale changes, we reload theme translations
         * @deprecated: the term "lang" was deprecated in favor of "locale" publicly in 4.0
         */
        events.on('settings.lang.edited', (model) => {
            debug('Active theme init18n');
            this.getActiveTheme().initI18n({locale: model.get('value')});
        });

        // NOTE: eventually this event should somehow be listened on and handled by the URL Service
        //       for now this eliminates the need for the frontend routing to listen to
        //       server events
        events.on('settings.timezone.edited', (model) => {
            routerManager.handleTimezoneEdit(model);
        });
    }

    getActiveTheme() {
        return themeEngine.getActive();
    }

    async activateTheme(loadedTheme, checkedTheme) {
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

            themeEngine.setActive(settings, loadedTheme, checkedTheme);
            const currentGhostAPI = this.getActiveTheme().engine('ghost-api');

            if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
                events.emit('services.themes.api.changed');
                await this.reloadFrontend();
            }

            const cardAssetConfig = this.getCardAssetConfig();
            debug('reload card assets config', cardAssetConfig);
            await cardAssetService.load(cardAssetConfig);
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

    getCardAssetConfig() {
        if (this.getActiveTheme()) {
            return this.getActiveTheme().config('card_assets');
        } else {
            return true;
        }
    }

    async reloadFrontend() {
        const apiVersion = this.getFrontendApiVersion();

        debug('reload frontend', apiVersion);
        const siteApp = require('./frontend/web/site');
        await siteApp.reload({apiVersion});
    }
}

const bridge = new Bridge();

module.exports = bridge;
