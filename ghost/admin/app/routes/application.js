import AuthConfiguration from 'ember-simple-auth/configuration';
import Route from '@ember/routing/route';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {InitSentryForEmber} from '@sentry/ember';
import {
    isAjaxError,
    isNotFoundError,
    isUnauthorizedError
} from 'ember-ajax/errors';
import {isArray as isEmberArray} from '@ember/array';
import {
    isMaintenanceError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'default'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

export default Route.extend(ShortcutsRoute, {
    ajax: service(),
    config: service(),
    feature: service(),
    ghostPaths: service(),
    notifications: service(),
    router: service(),
    session: service(),
    settings: service(),
    ui: service(),
    whatsNew: service(),
    billing: service(),

    shortcuts,

    routeAfterAuthentication: 'home',

    init() {
        this._super(...arguments);

        this.router.on('routeDidChange', () => {
            this.notifications.displayDelayed();
        });

        this.ui.initBodyDragHandlers();
    },

    async beforeModel() {
        await this.session.setup();
        return this.prepareApp();
    },

    async afterModel(model, transition) {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.session.appLoadTransition = transition;
        }

        this._appLoaded = true;
    },

    actions: {
        closeMenus() {
            this.ui.closeMenus();
        },

        didTransition() {
            this.session.appLoadTransition = null;
            this.send('closeMenus');
        },

        authorizationFailed() {
            windowProxy.replaceLocation(AuthConfiguration.rootURL);
        },

        // noop default for unhandled save (used from shortcuts)
        save: K,

        error(error, transition) {
            // unauthoirized errors are already handled in the ajax service
            if (isUnauthorizedError(error)) {
                return false;
            }

            if (isNotFoundError(error)) {
                if (transition) {
                    transition.abort();
                }

                let routeInfo = transition.to;
                let router = this.router;
                let params = [];

                for (let key of Object.keys(routeInfo.params)) {
                    params.push(routeInfo.params[key]);
                }

                let url = router.urlFor(routeInfo.name, ...params)
                    .replace(/^#\//, '')
                    .replace(/^\//, '')
                    .replace(/^ghost\//, '');

                return this.replaceWith('error404', url);
            }

            if (isVersionMismatchError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.upgradeStatus.requireUpgrade();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isMaintenanceError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.upgradeStatus.maintenanceAlert();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isAjaxError(error) || error && error.payload && isEmberArray(error.payload.errors)) {
                this.notifications.showAPIError(error);
                // don't show the 500 page if we weren't navigating
                if (!transition) {
                    return false;
                }
            }

            // fallback to 500 error page
            return true;
        }
    },

    willDestroy() {
        this.ui.cleanupBodyDragHandlers();
    },

    async prepareApp() {
        await this.config.fetchUnauthenticated();

        // init Sentry here rather than app.js so that we can use API-supplied
        // sentry_dsn and sentry_env rather than building it into release assets
        if (this.config.get('sentry_dsn')) {
            InitSentryForEmber({
                dsn: this.config.get('sentry_dsn'),
                environment: this.config.get('sentry_env'),
                release: `ghost@${this.config.get('version')}`,
                beforeSend(event) {
                    event.tags = event.tags || {};
                    event.tags.shown_to_user = event.tags.shown_to_user || false;
                    event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');
                    return event;
                }
            });
        }

        if (this.session.isAuthenticated) {
            try {
                await this.session.populateUser();
            } catch (e) {
                await this.session.invalidate();
            }

            await this.session.postAuthPreparation();
        }

        if (this.config.get('hostSettings.forceUpgrade')) {
            // enforce opening the BMA in a force upgrade state
            this.billing.openBillingWindow(this.router.currentURL, '/pro');
        }
    }

});
