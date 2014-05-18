var ApplicationRoute = Ember.Route.extend({
    actions: {
        signedIn: function (user) {
            this.container.lookup('user:current').setProperties(user);
        },

        signedOut: function () {
            this.container.lookup('user:current').setProperties({
                id: null,
                name: null,
                image: null
            });
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
            this.notifications.clear();
            errors.forEach(function (errorObj) {
                this.notifications.showError(errorObj.message || errorObj);

                if (errorObj.hasOwnProperty('el')) {
                    errorObj.el.addClass('input-error');
                }
            });
        }
    }
});

export default ApplicationRoute;