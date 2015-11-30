/* global key */

import Ember from 'ember';
import AuthConfiguration from 'ember-simple-auth/configuration';
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';
import windowProxy from 'ghost/utils/window-proxy';

const {Route, inject} = Ember;

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'all'};
shortcuts.enter = {action: 'confirmModal', scope: 'modal'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

export default Route.extend(ApplicationRouteMixin, ShortcutsRoute, {
    shortcuts,

    config: inject.service(),
    dropdown: inject.service(),
    notifications: inject.service(),

    afterModel(model, transition) {
        if (this.get('session.isAuthenticated')) {
            transition.send('loadServerNotifications');
        }
    },

    title(tokens) {
        return `${tokens.join(' - ')} - ${this.get('config.blogTitle')}`;
    },

    sessionAuthenticated() {
        let appController = this.controllerFor('application');

        if (appController && appController.get('skipAuthSuccessHandler')) {
            return;
        }

        this._super(...arguments);
        this.get('session.user').then((user) => {
            this.send('signedIn', user);
        });
    },

    sessionInvalidated() {
        this.send('authorizationFailed');
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
            this.send('closeModal');
            this.controller.setProperties({
                showSettingsMenu: false,
                showMobileMenu: false
            });
        },

        didTransition() {
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

        openModal(modalName, model, type) {
            this.get('dropdown').closeDropdowns();
            key.setScope('modal');
            modalName = `modals/${modalName}`;
            this.set('modalName', modalName);

            // We don't always require a modal to have a controller
            // so we're skipping asserting if one exists
            if (this.controllerFor(modalName, true)) {
                this.controllerFor(modalName).set('model', model);

                if (type) {
                    this.controllerFor(modalName).set('imageType', type);
                    this.controllerFor(modalName).set('src', model.get(type));
                }
            }

            return this.render(modalName, {
                into: 'application',
                outlet: 'modal'
            });
        },

        confirmModal() {
            let modalName = this.get('modalName');

            this.send('closeModal');

            if (this.controllerFor(modalName, true)) {
                this.controllerFor(modalName).send('confirmAccept');
            }
        },

        closeModal() {
            this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });

            key.setScope('default');
        },

        loadServerNotifications(isDelayed) {
            if (this.get('session.isAuthenticated')) {
                this.get('session.user').then((user) => {
                    if (!user.get('isAuthor') && !user.get('isEditor')) {
                        this.store.findAll('notification', {reload: true}).then((serverNotifications) => {
                            serverNotifications.forEach((notification) => {
                                this.get('notifications').handleNotification(notification, isDelayed);
                            });
                        });
                    }
                });
            }
        },

        // noop default for unhandled save (used from shortcuts)
        save: K
    }
});
