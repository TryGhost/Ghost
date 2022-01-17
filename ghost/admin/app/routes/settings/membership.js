import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class MembershipSettingsRoute extends AdminRoute {
    @service settings;

    model() {
        this.settings.reload();
    }

    actions = {
        willTransition(transition) {
            return this.controller.leaveRoute(transition);
        }
    }

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
