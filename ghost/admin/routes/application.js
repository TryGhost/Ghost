var ApplicationRoute = Ember.Route.extend({
    actions: {
        signedIn: function (user) {
            // Update the user on all routes and controllers
            this.container.unregister('user:current');
            this.container.register('user:current', user, { instantiate: false });

            this.container.injection('route', 'user', 'user:current');
            this.container.injection('controller', 'user', 'user:current');

            this.set('user', user);
            this.set('controller.user', user);
        },

        signedOut: function () {
            // Nullify the user on all routes and controllers
            this.container.unregister('user:current');
            this.container.register('user:current', null, { instantiate: false });

            this.container.injection('route', 'user', 'user:current');
            this.container.injection('controller', 'user', 'user:current');

            this.set('user', null);
            this.set('controller.user', null);
        },

        openModal: function (modalName, model) {
            modalName = 'modals/' + modalName;
            // We don't always require a modal to have a controller
            // so we're skipping asserting if one exists
            if (this.controllerFor(modalName, true)) {
                this.controllerFor(modalName).set('model', model);
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