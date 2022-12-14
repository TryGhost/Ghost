import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class LabsRoute extends AdminRoute {
    @service settings;
    @service notifications;

    model() {
        return this.settings.reload();
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Labs'
        };
    }
}
