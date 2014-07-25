import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-login'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },

    // the deactivate hook is called after a route has been exited.
    deactivate: function () {
        this._super();

        // clear the password property from the controller when we're no longer
        // on the signin screen
        this.controllerFor('signin').set('password', '');
    },

    actions: {
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
        sessionInvalidationSucceeded: function () {
            this.notifications.showSuccess('You were successfully signed out.', true);
            this.send('signedOut');
        }
    }


});

export default SigninRoute;
