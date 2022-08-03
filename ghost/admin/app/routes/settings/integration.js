import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default AdminRoute.extend({
    router: service(),

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
            if (this.controller) {
                this.controller.set('selectedApiKey', null);
                this.controller.set('isApiKeyRegenerated', false);
            }
        });
    },

    model(params, transition) {
        // use the integrations controller to fetch all integrations and pick
        // out the one we want. Allows navigation back to integrations screen
        // without a loading state
        return this
            .controllerFor('settings.integrations')
            .integrationModelHook('id', params.integration_id, this, transition);
    },

    deactivate() {
        this._super(...arguments);
        this.controller.set('leaveScreenTransition', null);
        this.controller.set('showUnsavedChangesModal', false);
    },

    actions: {
        save() {
            this.controller.send('save');
        }
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name.match(/^settings\.integration\./) && transition.targetName) {
            let {controller} = this;

            // check to see if we're navigating away from the custom integration
            // route - we want to allow editing webhooks without showing the
            // "unsaved changes" confirmation modal
            let isExternalRoute =
                // allow sub-routes of integration
                !(transition.targetName || '').match(/^integration\./)
                // do not allow changes in integration
                // .to will be the index, so use .to.parent to get the route with the params
                || transition.to.parent.params.integration_id !== controller.integration.id;

            if (isExternalRoute && !controller.integration.isDeleted && controller.integration.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Integrations'
        };
    }
});
