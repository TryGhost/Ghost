import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-login'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
        }
    },
    actions: {
        sessionAuthenticationFailed: function (error) {
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
                    self.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
                }
            });
        },
        sessionInvalidationFailed: function (error) {
            this.notifications.showError(error.message);
        },
        sessionInvalidationSucceeded: function () {
            this.notifications.showSuccess('You were successfully signed out.', true);
            this.send('signedOut');
        }
    }


});

export default SigninRoute;