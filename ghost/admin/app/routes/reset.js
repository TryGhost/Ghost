import Route from '@ember/routing/route';
import UnauthenticatedRouteMixin from 'ghost-admin/mixins/unauthenticated-route-mixin';
import {inject as service} from '@ember/service';

export default Route.extend(UnauthenticatedRouteMixin, {
    notifications: service(),
    session: service(),

    beforeModel() {
        if (this.get('session.isAuthenticated')) {
            this.notifications.showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
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
    },

    buildRouteInfoMetadata() {
        return {
            bodyClasses: ['unauthenticated-route']
        };
    }
});
