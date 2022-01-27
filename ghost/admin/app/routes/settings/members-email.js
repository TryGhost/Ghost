import AdminRoute from 'ghost-admin/routes/admin';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersEmailRoute extends AdminRoute {
    @service notifications;
    @service settings;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to.queryParams?.fromAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Newsletter email address has been updated`,
                {type: 'success', key: 'members.settings.from-address.updated'}
            );
        }
    }

    model() {
        return this.settings.reload();
    }

    setupController(controller) {
        controller.resetEmailAddresses();
    }

    @action
    willTransition(transition) {
        return this.controller.leaveRoute(transition);
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Members'
        };
    }
}
