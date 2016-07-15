import Route from 'ember-route';
import {htmlSafe} from 'ember-string';
import injectService from 'ember-service/inject';
import run from 'ember-runloop';
import {isEmberArray} from 'ember-array/utils';

import AuthConfiguration from 'ember-simple-auth/configuration';
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'all'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

export default Route.extend(ApplicationRouteMixin, ShortcutsRoute, {
    shortcuts,

    config: injectService(),
    feature: injectService(),
    dropdown: injectService(),
    notifications: injectService(),
    upgradeNotification: injectService(),

    afterModel(model, transition) {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.set('appLoadTransition', transition);
            transition.send('loadServerNotifications');
            transition.send('checkForOutdatedDesktopApp');

            // return the feature loading promise so that we block until settings
            // are loaded in order for synchronous access everywhere
            return this.get('feature').fetch();
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
    },

    actions: {
        openMobileMenu() {
            this.controller.set('showMobileMenu', true);
        },

        openSettingsMenu() {
            this.controller.set('showSettingsMenu', true);
        },

        closeMenus() {
            this.get('dropdown').closeDropdowns();
            this.controller.setProperties({
                showSettingsMenu: false,
                showMobileMenu: false
            });
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
                                if (notification.get('type') === 'upgrade') {
                                    this.get('upgradeNotification').set('content', notification.get('message'));
                                } else {
                                    this.get('notifications').handleNotification(notification, isDelayed);
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

        toggleMarkdownHelpModal() {
            this.get('controller').toggleProperty('showMarkdownHelpModal');
        },

        // noop default for unhandled save (used from shortcuts)
        save: K,

        error(error, transition) {
            if (error && isEmberArray(error.errors)) {
                switch (error.errors[0].errorType) {

                    case 'NotFoundError':
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

                    case 'VersionMismatchError':
                        if (transition) {
                            transition.abort();
                        }

                        this.get('upgradeStatus').requireUpgrade();
                        return false;

                    case 'Maintenance':
                        if (transition) {
                            transition.abort();
                        }

                        this.get('upgradeStatus').maintenanceAlert();
                        return false;

                    default:
                        this.get('notifications').showAPIError(error);
                        // don't show the 500 page if we weren't navigating
                        if (!transition) {
                            return false;
                        }
                }
            }

            // fallback to 500 error page
            return true;
        }
    }
});
