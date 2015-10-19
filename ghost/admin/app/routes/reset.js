import Ember from 'ember';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

export default Ember.Route.extend(styleBody, {
    classNames: ['ghost-reset'],

    notifications: Ember.inject.service(),
    session: Ember.inject.service(),

    beforeModel: function () {
        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
            this.transitionTo(Configuration.routeAfterAuthentication);
        }
    },

    setupController: function (controller, params) {
        controller.token = params.token;
    },

    // Clear out any sensitive information
    deactivate: function () {
        this._super();
        this.controller.clearData();
    }
});
