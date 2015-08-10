/* global key */

import Ember from 'ember';
import ApplicationRouteMixin from 'simple-auth/mixins/application-route-mixin';
import Configuration from 'simple-auth/configuration';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost/utils/ctrl-or-cmd';

var shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'all'};
shortcuts.enter = {action: 'confirmModal', scope: 'modal'};
shortcuts[ctrlOrCmd + '+s'] = {action: 'save', scope: 'all'};

export default Ember.Route.extend(ApplicationRouteMixin, ShortcutsRoute, {
    shortcuts: shortcuts,

    config: Ember.inject.service(),
    dropdown: Ember.inject.service(),
    notifications: Ember.inject.service(),

    afterModel: function (model, transition) {
        if (this.get('session').isAuthenticated) {
            transition.send('loadServerNotifications');
        }
    },

    title: function (tokens) {
        return tokens.join(' - ') + ' - ' + this.get('config.blogTitle');
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
            this.get('notifications').closeAll();
            this.send('closeModal');
            this.controller.setProperties({
                showSettingsMenu: false,
                showMobileMenu: false
            });
        },

        signedIn: function () {
            this.send('loadServerNotifications', true);
        },

        invalidateSession: function () {
            this.get('session').invalidate();
        },

        sessionAuthenticationFailed: function (error) {
            if (error.errors) {
                // These are server side errors, which can be marked as htmlSafe
                error.errors.forEach(function (err) {
                    err.message = err.message.htmlSafe();
                });
            } else {
                // Connection errors don't return proper status message, only req.body
                this.get('notifications').showAlert('There was a problem on the server.', {type: 'error'});
            }
        },

        sessionAuthenticationSucceeded: function () {
            var appController = this.controllerFor('application'),
                self = this;

            if (appController && appController.get('skipAuthSuccessHandler')) {
                return;
            }

            this.get('session.user').then(function (user) {
                self.send('signedIn', user);
                var attemptedTransition = self.get('session').get('attemptedTransition');
                if (attemptedTransition) {
                    attemptedTransition.retry();
                    self.get('session').set('attemptedTransition', null);
                } else {
                    self.transitionTo(Configuration.routeAfterAuthentication);
                }
            });
        },

        sessionInvalidationFailed: function (error) {
            this.get('notifications').showAlert(error.message, {type: 'error'});
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
            var modalName = this.get('modalName');

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
            var self = this;

            if (this.session.isAuthenticated) {
                this.get('session.user').then(function (user) {
                    if (!user.get('isAuthor') && !user.get('isEditor')) {
                        self.store.findAll('notification').then(function (serverNotifications) {
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
