import DS from 'ember-data';
import EmberObject from 'ember-object';
import Route from 'ember-route';
import UnauthenticatedRouteMixin from 'ghost-admin/mixins/unauthenticated-route-mixin';
import styleBody from 'ghost-admin/mixins/style-body';

const {Errors} = DS;

export default Route.extend(UnauthenticatedRouteMixin, styleBody, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    model() {
        return EmberObject.create({
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
