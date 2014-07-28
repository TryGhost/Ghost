import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var ResetRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-reset'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.notifications.showWarn('You can\'t reset your password while you\'re signed in.', true);
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },
    setupController: function (controller, params) {
        controller.token = params.token;
    }
});

export default ResetRoute;
