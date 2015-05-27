import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import Configuration from 'simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

export default Ember.Route.extend(styleBody, {
    titleToken: 'Setup',

    classNames: ['ghost-setup'],

    ghostPaths: Ember.inject.service('ghost-paths'),

    // use the beforeModel hook to check to see whether or not setup has been
    // previously completed.  If it has, stop the transition into the setup page.
    beforeModel: function () {
        var self = this;

        // If user is logged in, setup has already been completed.
        if (this.get('session').isAuthenticated) {
            this.transitionTo(Configuration.routeAfterAuthentication);
            return;
        }

        // If user is not logged in, check the state of the setup process via the API
        return ajax(this.get('ghostPaths.url').api('authentication/setup'), {
            type: 'GET'
        }).then(function (result) {
            var setup = result.setup[0].status;

            if (setup) {
                return self.transitionTo('signin');
            }
        });
    }
});
