/* global key */

import Ember from 'ember';
import AuthConfiguration from 'ember-simple-auth/configuration';
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';
import windowProxy from 'ghost/utils/window-proxy';

const shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'all'};
shortcuts.enter = {action: 'confirmModal', scope: 'modal'};
shortcuts[ctrlOrCmd + '+s'] = {action: 'save', scope: 'all'};

export default Ember.Route.extend(ApplicationRouteMixin, ShortcutsRoute, {
    shortcuts: shortcuts,

    config: Ember.inject.service(),
    dropdown: Ember.inject.service(),
    notifications: Ember.inject.service(),

    afterModel: function (model, transition) {
        if (this.get('session.isAuthenticated')) {
            transition.send('loadServerNotifications');
        }
    },

    title: function (tokens) {
        return tokens.join(' - ') + ' - ' + this.get('config.blogTitle');
    },

    sessionAuthenticated: function () {
        const appController = this.controllerFor('application'),
            self = this;

        if (appController && appController.get('skipAuthSuccessHandler')) {
            return;
        }

        this._super(...arguments);
        this.get('session.user').then(function (user) {
            self.send('signedIn', user);
        });
    },

    sessionInvalidated: function () {
        this.send('authorizationFailed');
    },

    actions: {
        openMobileMenu: function () {
            this.controller.set('showMobileMenu', true);
        },

        openSettingsMenu: function () {
            this.controller.set('showSettingsMenu', true);
        },

        closeMenus: function () {
            this.get('dropdown').closeDropdowns();
            this.send('closeModal');
            this.controller.setProperties({
                showSettingsMenu: false,
                showMobileMenu: false
            });
        },

        didTransition: function () {
            this.send('closeMenus');
        },

        signedIn: function () {
            this.get('notifications').clearAll();
            this.send('loadServerNotifications', true);
        },

        invalidateSession: function () {
            this.get('session').invalidate().catch(function (error) {
                this.get('notifications').showAlert(error.message, {type: 'error', key: 'session.invalidate.failed'});
            });
        },

        authorizationFailed: function () {
            windowProxy.replaceLocation(AuthConfiguration.baseURL);
        },

        openModal: function (modalName, model, type) {
            this.get('dropdown').closeDropdowns();
            key.setScope('modal');
            modalName = 'modals/' + modalName;
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

        confirmModal: function () {
            let modalName = this.get('modalName');

            this.send('closeModal');

            if (this.controllerFor(modalName, true)) {
                this.controllerFor(modalName).send('confirmAccept');
            }
        },

        closeModal: function () {
            this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });

            key.setScope('default');
        },

        loadServerNotifications: function (isDelayed) {
            let self = this;

            if (this.get('session.isAuthenticated')) {
                this.get('session.user').then(function (user) {
                    if (!user.get('isAuthor') && !user.get('isEditor')) {
                        self.store.findAll('notification', {reload: true}).then(function (serverNotifications) {
                            serverNotifications.forEach(function (notification) {
                                self.get('notifications').handleNotification(notification, isDelayed);
                            });
                        });
                    }
                });
            }
        },

        // noop default for unhandled save (used from shortcuts)
        save: Ember.K
    }
});
