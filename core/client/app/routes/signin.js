import Ember from 'ember';
import styleBody from 'ghost/mixins/style-body';
import Configuration from 'ember-simple-auth/configuration';
import DS from 'ember-data';

const {
    Route,
    inject: {service}
} = Ember;
const {Errors} = DS;

export default Route.extend(styleBody, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    session: service(),

    beforeModel() {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
        }
    },

    model() {
        return Ember.Object.create({
            identification: '',
            password: '',
            errors: Errors.create()
        });
    },

    // the deactivate hook is called after a route has been exited.
    deactivate() {
        let controller = this.controllerFor('signin');

        this._super(...arguments);

        // clear the properties that hold the credentials when we're no longer on the signin screen
        controller.set('model.identification', '');
        controller.set('model.password', '');
    }
});
