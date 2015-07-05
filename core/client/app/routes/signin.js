import Ember from 'ember';
import Configuration from 'simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';
import DS from 'ember-data';

var SigninRoute = Ember.Route.extend(styleBody, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.transitionTo(Configuration.routeAfterAuthentication);
        }
    },

    model: function () {
        return Ember.Object.create({
            identification: '',
            password: '',
            errors: DS.Errors.create()
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
