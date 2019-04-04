import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Integrations',
    classNames: ['settings-view-integration'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model(params, transition) {
        // use the integrations controller to fetch all integrations and pick
        // out the one we want. Allows navigation back to integrations screen
        // without a loading state
        return this
            .controllerFor('settings.integrations')
            .integrationModelHook('id', params.integration_id, this, transition);
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let {controller} = this;

            // check to see if we're navigating away from the custom integration
            // route - we want to allow editing webhooks without showing the
            // "unsaved changes" confirmation modal
            let isExternalRoute =
                // allow sub-routes of settings.integration
                !transition.targetName.match(/^settings\.integration\./)
                // do not allow changes in integration
                || transition.params['settings.integration'].integration_id !== controller.integration.id;

            if (isExternalRoute && !controller.integration.isDeleted && controller.integration.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
