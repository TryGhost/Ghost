import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-setup'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.transitionTo(Ember.SimpleAuth.routeAfterAuthentication);
        }
    }
});

export default SetupRoute;
