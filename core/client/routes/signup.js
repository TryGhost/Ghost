import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-signup'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.notifications.showWarn('You need to sign out to register as a new user.', true);
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },
    setupController: function (controller, params) {
        var tokenText = atob(params.token),
            email = tokenText.split('|')[1];
        controller.token = params.token;
        controller.email = email;
    }
});

export default SignupRoute;
