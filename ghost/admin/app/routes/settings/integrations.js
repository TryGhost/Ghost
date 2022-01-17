import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class IntegrationsRoute extends AdminRoute {
    @service settings;

    setupController(controller) {
        // kick off the background fetch of integrations so that we can
        // show the screen immediately
        controller.fetchIntegrations.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Integrations'
        };
    }
}
