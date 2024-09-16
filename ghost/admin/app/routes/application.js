import * as Sentry from '@sentry/ember';
import AdminXSettings from '../components/admin-x/settings';
import AuthConfiguration from 'ember-simple-auth/configuration';
import React from 'react';
import ReactDOM from 'react-dom';
import Route from '@ember/routing/route';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Debug} from '@sentry/integrations';
import {Replay} from '@sentry/replay';
import {beforeSend} from 'ghost-admin/utils/sentry';
import {importComponent} from '../components/admin-x/admin-x-component';
import {inject} from 'ghost-admin/decorators/inject';
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
import {later} from '@ember/runloop';
import {inject as service} from '@ember/service';

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'default'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

// make globals available for any pulled in UMD components
// - avoids external components needing to bundle React and running into multiple version errors
window.React = React;
window.ReactDOM = ReactDOM;

export default Route.extend(ShortcutsRoute, {
    ajax: service(),
    configManager: service(),
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

    config: inject(),

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

            // Need a tiny delay here to allow the router to update to the current route
            later(() => {
                Sentry.setTag('route', this.router.currentRouteName);
            }, 2);
        },

        authorizationFailed() {
            windowProxy.replaceLocation(AuthConfiguration.rootURL);
        },

        // noop default for unhandled save (used from shortcuts)
        save: K,

        error(error, transition) {
            // unauthorized errors are already handled in the ajax service
            if (isUnauthorizedError(error)) {
                return false;
            }

            if (isNotFoundError(error)) {
                if (transition) {
                    transition.abort();

                    let routeInfo = transition?.to;
                    let router = this.router;
                    let params = [];

                    if (routeInfo) {
                        for (let key of Object.keys(routeInfo.params)) {
                            params.push(routeInfo.params[key]);
                        }

                        let url = router.urlFor(routeInfo.name, ...params)
                            .replace(/^#\//, '')
                            .replace(/^\//, '')
                            .replace(/^ghost\//, '');

                        return this.replaceWith('error404', url);
                    }
                }

                // when there's no transition we fall through to our generic error handler
                // for network errors that will hit the isAjaxError branch below
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
        await this.configManager.fetchUnauthenticated();

        // init Sentry here rather than app.js so that we can use API-supplied
        // sentry_dsn and sentry_env rather than building it into release assets
        if (this.config.sentry_dsn) {
            const sentryConfig = {
                dsn: this.config.sentry_dsn,
                environment: this.config.sentry_env,
                release: `ghost@${this.config.version}`,
                beforeSend,
                ignoreErrors: [
                    // Browser autoplay policies (this regex covers a few)
                    /The play\(\) request was interrupted.*/,
                    /The request is not allowed by the user agent or the platform in the current context/,

                    // Network errors that we don't control
                    /Server was unreachable/,
                    /NetworkError when attempting to fetch resource./,
                    /Failed to fetch/,
                    /Load failed/,
                    /The operation was aborted./,

                    // TransitionAborted errors surface from normal application behaviour
                    // - https://github.com/emberjs/ember.js/issues/12505
                    /^TransitionAborted$/,
                    // ResizeObserver loop errors occur often from extensions and
                    // embedded content, generally harmless and not useful to report
                    /^ResizeObserver loop completed with undelivered notifications/,
                    /^ResizeObserver loop limit exceeded/,
                    // When tasks in ember-concurrency are canceled, they sometimes lead to unhandled Promise rejections
                    // This doesn't affect the application and is not useful to report
                    // - http://ember-concurrency.com/docs/cancelation
                    'TaskCancelation'
                ],
                integrations: []
            };

            try {
                // Session Replay on errors
                // Docs: https://docs.sentry.io/platforms/javascript/session-replay
                sentryConfig.replaysOnErrorSampleRate = 0.5;
                sentryConfig.integrations.push(
                    // Replace with `Sentry.replayIntegration()` once we've migrated to @sentry/ember 8.x
                    // Docs: https://docs.sentry.io/platforms/javascript/migration/v7-to-v8/#removal-of-sentryreplay-package
                    new Replay({
                        mask: ['.koenig-lexical', '.gh-dashboard'],
                        unmask: ['[role="menu"]', '[data-testid="settings-panel"]', '.gh-nav'],
                        maskAllText: false,
                        maskAllInputs: true,
                        blockAllMedia: true
                    })
                );
            } catch (e) {
                // no-op, Session Replay is not critical
                console.error('Error enabling Sentry Replay:', e); // eslint-disable-line no-console
            }

            if (this.config.sentry_env === 'development') {
                sentryConfig.integrations.push(new Debug());
            }
            Sentry.init(sentryConfig);
        }

        if (this.session.isAuthenticated) {
            try {
                await this.session.populateUser();
            } catch (e) {
                await this.session.invalidate();
            }

            await this.session.postAuthPreparation();
        }

        if (this.config.hostSettings?.forceUpgrade) {
            // enforce opening the BMA in a force upgrade state
            this.billing.openBillingWindow(this.router.currentURL, '/pro');
        }

        // Preload settings to avoid a delay when opening
        setTimeout(() => {
            importComponent(AdminXSettings.packageName);
        }, 1000);
    }

});
