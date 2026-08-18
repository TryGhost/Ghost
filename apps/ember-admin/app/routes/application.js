import * as Sentry from '@sentry/ember';
import * as jsxRuntime from 'react/jsx-runtime';
import AuthConfiguration from 'ember-simple-auth/configuration';
import React from 'react';
import ReactDOM from 'react-dom';
import Route from '@ember/routing/route';
import SearchModal from '../components/modals/search';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {getSentryConfig} from '../utils/sentry';
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

const AUTOMATIONS_REPLAY_SAMPLE_RATE = 1;
const AUTOMATIONS_REPLAY_MASK_ATTRIBUTE = 'data-sentry-automations-mask';

function isAutomationsUrl(url) {
    const path = new URL(url).hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '');
    return path === '/automations' || path.startsWith('/automations/');
}

function setupAutomationsSessionReplay(replay, shouldStartRecording) {
    let initialRouteCheck;
    let removeNavigationListener;
    let recordingStarted = false;

    const teardown = () => {
        clearTimeout(initialRouteCheck);
        removeNavigationListener?.();
        document.body.removeAttribute(AUTOMATIONS_REPLAY_MASK_ATTRIBUTE);
    };

    const updateAutomationsMask = (url) => {
        const isAutomations = isAutomationsUrl(url);

        if (isAutomations) {
            document.body.setAttribute(AUTOMATIONS_REPLAY_MASK_ATTRIBUTE, 'true');
        } else {
            document.body.removeAttribute(AUTOMATIONS_REPLAY_MASK_ATTRIBUTE);
        }

        return isAutomations;
    };

    const maybeStartRecording = (url) => {
        const isAutomations = updateAutomationsMask(url);

        if (!shouldStartRecording || !isAutomations || recordingStarted) {
            return;
        }

        recordingStarted = true;
        clearTimeout(initialRouteCheck);

        replay.stop().then(() => replay.start()).catch((error) => {
            try {
                replay.startBuffering();
            } catch (e) {
                // Replay is still running, nothing to restore
            }
            console.error('Error starting Sentry Replay recording:', error); // eslint-disable-line no-console
        });
    };

    // Keep listening after recording starts so portalled Automations content is
    // masked only while an Automations route is active. React-owned admin
    // routes navigate via pushState, which doesn't fire `hashchange`.
    if (window.navigation) {
        const onNavigate = event => maybeStartRecording(event.destination.url);
        window.navigation.addEventListener('navigate', onNavigate);
        removeNavigationListener = () => window.navigation.removeEventListener('navigate', onNavigate);
    }

    // Mask direct Automations loads before Replay creates its initial buffer.
    updateAutomationsMask(window.location.href);

    // Replay defers its sampling initialization during Sentry.init(). Queue the
    // initial route check behind it to avoid starting a second rrweb recorder.
    initialRouteCheck = setTimeout(() => maybeStartRecording(window.location.href));

    return teardown;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'default'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};
shortcuts[`${ctrlOrCmd}+k`] = {action: 'openSearchModal'};
shortcuts[`${ctrlOrCmd}+,`] = {action: 'openSettings'};

// make globals available for any pulled in UMD components
// - avoids external components needing to bundle React and running into multiple version errors
window.React = React;
window.React.jsx = jsxRuntime.jsx;
window.React.jsxs = jsxRuntime.jsxs;
window.React.Fragment = jsxRuntime.Fragment;
window.ReactDOM = ReactDOM;

export default Route.extend(ShortcutsRoute, {
    ajax: service(),
    configManager: service(),
    ghostPaths: service(),
    notifications: service(),
    router: service(),
    session: service(),
    settings: service(),
    stateBridge: service(),
    ui: service(),
    billing: service(),
    modals: service(),

    shortcuts,

    routeAfterAuthentication: 'index',

    init() {
        this._super(...arguments);

        this.router.on('routeDidChange', () => {
            this.notifications.displayDelayed();
        });

        this.ui.initBodyDragHandlers();
    },

    config: inject(),

    async beforeModel(transition) {
        await this.session.setup();

        // Intercept the root route when unauthenticated so `/` goes straight to
        // signin without storing a `ghost-signin-redirect` back to `/`.
        // Check AFTER session setup to ensure isAuthenticated is accurate
        if (transition.to?.name === 'index' && !this.session.isAuthenticated) {
            transition.abort();
            return this.transitionTo('signin');
        }

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
                    // Let Ember render the error substate (error.hbs) in place
                    // so the URL stays at the attempted destination
                    return true;
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
        },

        openSearchModal() {
            // Don't open the search modal if the sidebar is hidden
            // e.g. in the editor or settings screens
            if (this.ui.isFullScreen) {
                return;
            }

            return this.modals.open(SearchModal);
        },

        openSettings() {
            // Don't open the settings screen if the sidebar is hidden
            // e.g. in the editor or settings screens
            if (this.ui.isFullScreen) {
                return;
            }

            this.router.transitionTo('/settings');
        }
    },

    willDestroy() {
        this._cleanupAutomationsSessionReplay?.();
        this.ui.cleanupBodyDragHandlers();
    },

    async prepareApp() {
        await this.configManager.fetchUnauthenticated();

        // init Sentry here rather than app.js so that we can use API-supplied
        // sentry_dsn and sentry_env rather than building it into release assets
        if (this.config.sentry_dsn) {
            const sentryConfig = getSentryConfig(this.config.sentry_dsn, this.config.sentry_env, this.config.version);
            Sentry.init(sentryConfig);

            // Keep error-triggered replay buffering everywhere and mask all
            // Automations portals. Once a sampled app load enters Automations,
            // record a full session replay for the rest of that load.
            const replay = Sentry.getClient()?.getIntegrationByName('Replay');
            if (replay) {
                const shouldStartRecording = Math.random() < AUTOMATIONS_REPLAY_SAMPLE_RATE;
                this._cleanupAutomationsSessionReplay = setupAutomationsSessionReplay(replay, shouldStartRecording);
            }
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
            // enforce opening the billing app in a force upgrade state
            this.billing.openBillingWindow(this.router.currentURL, this.billing.getBillingRouteFromHash());
        }

        // Notify React of the initial subscription state
        // React uses this to derive forceUpgrade state (config.forceUpgrade && subscription.status !== 'active')
        this.stateBridge.triggerSubscriptionChange({
            subscription: this.billing.subscription
        });
    }

});
