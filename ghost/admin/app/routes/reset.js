import Route from 'ember-route';
import injectService from 'ember-service/inject';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost-admin/mixins/style-body';

export default Route.extend(styleBody, {
    classNames: ['ghost-reset'],

    notifications: injectService(),
    session: injectService(),

    beforeModel() {
        this._super(...arguments);
        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
            this.transitionTo(Configuration.routeAfterAuthentication);
        }
    },

    setupController(controller, params) {
        controller.token = params.token;
    },

    // Clear out any sensitive information
    deactivate() {
        this._super(...arguments);
        this.controller.clearData();
    }
});
