import Ember from 'ember';
import styleBody from 'ghost/mixins/style-body';
import UnauthenticatedRouteMixin from 'ember-simple-auth/mixins/unauthenticated-route-mixin';
import SigninValidator from 'ghost/mixins/validations/signin';
import ValidationMixin from 'ghost/mixins/validation';

const {
    Route,
    getOwner,
    Object: EmberObject
} = Ember;

// TODO: potentially move to `ghost/models/signin`?
const SigninModel = EmberObject.extend(SigninValidator, ValidationMixin, {
    identification: '',
    password: '',

    invalidProperty: null,

    clear() {
        this.setProperties({
            identification: '',
            password: '',
            invalidProperty: null
        });
    }
});

export default Route.extend(styleBody, UnauthenticatedRouteMixin, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    model() {
        return SigninModel.create(getOwner(this).ownerInjection());
    },

    // the deactivate hook is called after a route has been exited.
    deactivate() {
        let currentModel = this.modelFor(this.routeName);
        this._super(...arguments);

        currentModel.clear();
    }
});
