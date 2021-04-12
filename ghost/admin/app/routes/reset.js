import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';
import {inject as service} from '@ember/service';

export default UnauthenticatedRoute.extend({
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
    }
});
