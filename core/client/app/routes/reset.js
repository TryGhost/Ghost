import Ember from 'ember';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

const {Route, inject} = Ember;

export default Route.extend(styleBody, {
    classNames: ['ghost-reset'],

    notifications: inject.service(),
    session: inject.service(),

    beforeModel() {
        this._super(...arguments);
        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
            this.transitionTo(Configuration.routeAfterAuthentication);
        }
    },

    setupController(controller, params) {
        this._super(...arguments);
        controller.token = params.token;
    },

    // Clear out any sensitive information
    deactivate() {
        this._super(...arguments);
        this.controller.clearData();
    }
});
