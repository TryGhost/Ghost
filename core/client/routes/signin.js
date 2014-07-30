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

        // clear the properties that hold the credentials from the controller
        // when we're no longer on the signin screen
        this.controllerFor('signin').setProperties({ identification: '', password: '' });
    }
});

export default SigninRoute;
