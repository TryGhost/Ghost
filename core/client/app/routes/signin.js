import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },

    model: function () {
        return Ember.Object.create({
            identification: '',
            password: ''
        });
    },

    // the deactivate hook is called after a route has been exited.
    deactivate: function () {
        this._super();

        var controller = this.controllerFor('signin');

        // clear the properties that hold the credentials when we're no longer on the signin screen
        controller.set('model.identification', '');
        controller.set('model.password', '');
    }
});

export default SigninRoute;
