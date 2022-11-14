import AdminRoute from 'ghost-admin/routes/admin';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class ZapierRoute extends AdminRoute {
    @service router;

    @inject config;

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.config.hostSettings?.limits?.customIntegrations?.disabled) {
            return this.transitionTo('settings.integrations');
        }
    }

    model(params, transition) {
        // use the integrations controller to fetch all integrations and pick
        // out the one we want. Allows navigation back to integrations screen
        // without a loading state
        return this
            .controllerFor('settings.integrations')
            .integrationModelHook('slug', 'zapier', this, transition);
    }

    resetController(controller) {
        controller.regeneratedApiKey = null;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Zapier'
        };
    }
}
