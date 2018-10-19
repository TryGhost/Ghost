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
        let integration = this.store.peekRecord('integration', params.integration_id);

        if (integration) {
            return integration;
        }

        // integration is not already in the store so use the integrations controller
        // to fetch all of them and pull out the one we're interested in. Using the
        // integrations controller means it's possible to navigate back to the integrations
        // screen without triggering a loading state
        return this.controllerFor('settings.integrations')
            .fetchIntegrations.perform()
            .then((integrations) => {
                let integration = integrations.findBy('id', params.integration_id);

                if (!integration) {
                    let path = transition.intent.url.replace(/^\//, '');
                    return this.replaceWith('error404', {path, status: 404});
                }

                return integration;
            });
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let {controller} = this;

            if (!controller.integration.isDeleted && controller.integration.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
