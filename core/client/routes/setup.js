import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-setup'],

    // use the beforeModel hook to check to see whether or not setup has been
    // previously completed.  If it has, stop the transition into the setup page.

    beforeModel: function () {
        var self = this;

        // If user is logged in, setup has already been completed.
        if (this.get('session').isAuthenticated) {
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            return;
        }

        // If user is not logged in, check the state of the setup process via the API
        return ic.ajax.request(this.get('ghostPaths.url').api('authentication/setup'), {
            type: 'GET'
        }).then(function (result) {
            var setup = result.setup[0].status;

            if (setup) {
                return self.transitionTo('signin');
            }
        });
    }
});

export default SetupRoute;
