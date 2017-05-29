import Route from 'ember-route';
import UnauthenticatedRouteMixin from 'ghost-admin/mixins/unauthenticated-route-mixin';
import injectService from 'ember-service/inject';
import styleBody from 'ghost-admin/mixins/style-body';

export default Route.extend(styleBody, UnauthenticatedRouteMixin, {
    classNames: ['ghost-reset'],

    notifications: injectService(),
    session: injectService(),

    beforeModel() {
        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
        }

        this._super(...arguments);
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
