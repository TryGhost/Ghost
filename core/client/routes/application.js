import ShortcutsRoute from 'ghost/mixins/shortcuts-route';

var ApplicationRoute = Ember.Route.extend(SimpleAuth.ApplicationRouteMixin, ShortcutsRoute, {

    shortcuts: {
        'esc': 'closePopups'
    },

    actions: {
        closePopups: function () {
            this.get('popover').closePopovers();
            this.get('notifications').closeAll();

            this.send('closeModal');
        },

        signedIn: function () {
            this.send('loadServerNotifications', true);
        },

        sessionAuthenticationFailed: function (error) {
            this.notifications.closePassive();
            this.notifications.showError(error.message);
        },

        sessionAuthenticationSucceeded: function () {
            var self = this;
            this.store.find('user', 'me').then(function (user) {
                self.send('signedIn', user);
                var attemptedTransition = self.get('session').get('attemptedTransition');
                if (attemptedTransition) {
                    attemptedTransition.retry();
                    self.get('session').set('attemptedTransition', null);
                } else {
                    self.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                }
            });
        },

        sessionInvalidationFailed: function (error) {
            this.notifications.closePassive();
            this.notifications.showError(error.message);
        },

        openModal: function (modalName, model, type) {
            modalName = 'modals/' + modalName;
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

        closeModal: function () {
            return this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });
        },

        loadServerNotifications: function (isDelayed) {
            var self = this;
            if (this.session.isAuthenticated) {
                this.store.findAll('notification').then(function (serverNotifications) {
                    serverNotifications.forEach(function (notification) {
                        self.notifications.handleNotification(notification, isDelayed);
                    });
                });
            }
        },

        handleErrors: function (errors) {
            var self = this;
            this.notifications.clear();
            errors.forEach(function (errorObj) {
                self.notifications.showError(errorObj.message || errorObj);

                if (errorObj.hasOwnProperty('el')) {
                    errorObj.el.addClass('input-error');
                }
            });
        }
    }
});

export default ApplicationRoute;
