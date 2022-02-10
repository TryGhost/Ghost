import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class MembershipSettingsRoute extends AdminRoute {
    @service notifications;
    @service settings;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to.queryParams?.supportAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Support email address has been updated`,
                {type: 'success', key: 'members.settings.support-address.updated'}
            );
        }
    }

    model() {
        this.settings.reload();
    }

    actions = {
        willTransition(transition) {
            return this.controller.leaveRoute(transition);
        }
    };

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Membership'
        };
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }
}
