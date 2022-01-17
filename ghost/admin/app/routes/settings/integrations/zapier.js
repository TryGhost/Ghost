import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class ZapierRoute extends AdminRoute {
    @service router;
    @service config;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', () => {
            if (this.controller) {
                this.controller.set('selectedApiKey', null);
                this.controller.set('isApiKeyRegenerated', false);
            }
        });
    }

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.config.get('hostSettings.limits.customIntegrations.disabled')) {
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

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Zapier'
        };
    }
}
