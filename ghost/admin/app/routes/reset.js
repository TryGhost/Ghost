import UnauthenticatedRoute from 'ghost-admin/routes/unauthenticated';
import {inject as service} from '@ember/service';

export default class ResetRoute extends UnauthenticatedRoute {
    @service notifications;
    @service session;

    beforeModel() {
        if (this.session.isAuthenticated) {
            this.notifications.showAlert('You can\'t reset your password while you\'re signed in.', {type: 'warn', delayed: true, key: 'password.reset.signed-in'});
        }

        super.beforeModel(...arguments);
    }

    setupController(controller, params) {
        controller.token = params.token;
    }

    // Clear out any sensitive information
    deactivate() {
        super.deactivate(...arguments);
        this.controller.clearData();
    }
}
