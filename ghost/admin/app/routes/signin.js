// TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
// eslint-disable-next-line
import DS from 'ember-data';
import EmberObject from '@ember/object';
import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';

const {Errors} = DS;

const defaultModel = function defaultModel() {
    return EmberObject.create({
        identification: '',
        password: '',
        errors: Errors.create()
    });
};

export default class SigninRoute extends UnauthenticatedRoute {
    model() {
        return defaultModel();
    }

    // the deactivate hook is called after a route has been exited.
    deactivate() {
        let controller = this.controllerFor('signin');

        super.deactivate(...arguments);

        // clear the properties that hold the credentials when we're no longer on the signin screen
        controller.set('signin', defaultModel());
    }

    buildRouteInfoMetadata() {
        return Object.assign(super.buildRouteInfoMetadata(), {
            titleToken: 'Sign In'
        });
    }
}
