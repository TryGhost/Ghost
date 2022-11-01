// TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
// eslint-disable-next-line
import DS from 'ember-data';
import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';
import {tracked} from '@glimmer/tracking';

const {Errors} = DS;

class Signin {
    @tracked identification = '';
    @tracked password = '';

    errors = Errors.create();
}

const defaultModel = function defaultModel() {
    return new Signin();
};

export default class SigninRoute extends UnauthenticatedRoute {
    model() {
        return defaultModel();
    }

    // the deactivate hook is called after a route has been exited.
    deactivate() {
        super.deactivate(...arguments);

        // clear the properties that hold the credentials when we're no longer on the signin screen
        this.controllerFor('signin').model = defaultModel();
    }

    buildRouteInfoMetadata() {
        return Object.assign(super.buildRouteInfoMetadata(), {
            titleToken: 'Sign In'
        });
    }
}
