import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';
import AuthConfiguration from 'ember-simple-auth/configuration';
import RSVP from 'rsvp';
import Route from '@ember/routing/route';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import moment from 'moment';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {htmlSafe} from '@ember/string';
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
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'default'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

export default Route.extend(ApplicationRouteMixin, ShortcutsRoute, {
    config: service(),
    feature: service(),
    notifications: service(),
    settings: service(),
    tour: service(),
    ui: service(),

    shortcuts,

    routeAfterAuthentication: 'posts',

    beforeModel() {
        return this.get('config').fetch();
    },

    afterModel(model, transition) {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.set('appLoadTransition', transition);
            transition.send('loadServerNotifications');
            transition.send('checkForOutdatedDesktopApp');

            // trigger a background token refresh to enable "infinite" sessions
            // NOTE: we only do this if the last refresh was > 1 day ago to avoid
            // potential issues with multiple tabs and concurrent admin loads/refreshes.
            // see https://github.com/TryGhost/Ghost/issues/8616
            let session = this.get('session.session');
            let expiresIn = session.get('authenticated.expires_in') * 1000;
            let expiresAt = session.get('authenticated.expires_at');
            let lastRefresh = moment(expiresAt - expiresIn);
            let oneDayAgo = moment().subtract(1, 'day');

            if (lastRefresh.isBefore(oneDayAgo)) {
                let authenticator = session._lookupAuthenticator(session.authenticator);
                if (authenticator && authenticator.onOnline) {
                    authenticator.onOnline();
                }
            }

            let featurePromise = this.get('feature').fetch();
            let settingsPromise = this.get('settings').fetch();
            let privateConfigPromise = this.get('config').fetchPrivate();
            let tourPromise = this.get('tour').fetchViewed();

            // return the feature/settings load promises so that we block until
            // they are loaded to enable synchronous access everywhere
            return RSVP.all([
                featurePromise,
                settingsPromise,
                privateConfigPromise,
                tourPromise
            ]).then((results) => {
                this._appLoaded = true;
                return results;
            });
        }

        this._appLoaded = true;
    },

    actions: {
        closeMenus() {
            this.get('ui').closeMenus();
        },

        didTransition() {
            this.set('appLoadTransition', null);
            this.send('closeMenus');
        },

        signedIn() {
            this.get('notifications').clearAll();
            this.send('loadServerNotifications', true);
        },

        invalidateSession() {
            this.get('session').invalidate().catch((error) => {
                this.get('notifications').showAlert(error.message, {type: 'error', key: 'session.invalidate.failed'});
            });
        },

        authorizationFailed() {
            windowProxy.replaceLocation(AuthConfiguration.baseURL);
        },

        loadServerNotifications(isDelayed) {
            if (this.get('session.isAuthenticated')) {
                this.get('session.user').then((user) => {
                    if (!user.get('isAuthor') && !user.get('isEditor')) {
                        this.store.findAll('notification', {reload: true}).then((serverNotifications) => {
                            serverNotifications.forEach((notification) => {
                                if (notification.get('top') || notification.get('custom')) {
                                    this.get('notifications').handleNotification(notification, isDelayed);
                                } else {
                                    this.get('upgradeStatus').handleUpgradeNotification(notification);
                                }
                            });
                        });
                    }
                });
            }
        },

        checkForOutdatedDesktopApp() {
            // Check if the user is running an older version of Ghost Desktop
            // that needs to be manually updated
            // (yes, the desktop team is deeply ashamed of these lines 😢)
            let ua = navigator && navigator.userAgent ? navigator.userAgent : null;

            if (ua && ua.includes && ua.includes('ghost-desktop')) {
                let updateCheck = /ghost-desktop\/0\.((5\.0)|((4|2)\.0)|((3\.)(0|1)))/;
                let link = '<a href="https://dev.ghost.org/ghost-desktop-manual-update" target="_blank">click here</a>';
                let msg = `Your version of Ghost Desktop needs to be manually updated. Please ${link} to get started.`;

                if (updateCheck.test(ua)) {
                    this.get('notifications').showAlert(htmlSafe(msg), {
                        type: 'warn',
                        key: 'desktop.manual.upgrade'
                    });
                }
            }
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

                let routeInfo = transition.handlerInfos[transition.handlerInfos.length - 1];
                let router = this.get('router');
                let params = [];

                for (let key of Object.keys(routeInfo.params)) {
                    params.push(routeInfo.params[key]);
                }

                return this.transitionTo('error404', router.generate(routeInfo.name, ...params).replace('/ghost/', '').replace(/^\//g, ''));
            }

            if (isVersionMismatchError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.get('upgradeStatus').requireUpgrade();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isMaintenanceError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.get('upgradeStatus').maintenanceAlert();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isAjaxError(error) || error && error.payload && isEmberArray(error.payload.errors)) {
                this.get('notifications').showAPIError(error);
                // don't show the 500 page if we weren't navigating
                if (!transition) {
                    return false;
                }
            }

            // fallback to 500 error page
            return true;
        }
    },

    title(tokens) {
        return `${tokens.join(' - ')} - ${this.get('config.blogTitle')}`;
    },

    sessionAuthenticated() {
        if (this.get('session.skipAuthSuccessHandler')) {
            return;
        }

        // standard ESA post-sign-in redirect
        this._super(...arguments);

        // trigger post-sign-in background behaviour
        this.get('session.user').then((user) => {
            this.send('signedIn', user);
        });
    },

    sessionInvalidated() {
        let transition = this.get('appLoadTransition');

        if (transition) {
            transition.send('authorizationFailed');
        } else {
            run.scheduleOnce('routerTransitions', this, function () {
                this.send('authorizationFailed');
            });
        }
    }
});
