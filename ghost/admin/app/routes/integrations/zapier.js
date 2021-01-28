import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    router: service(),

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', () => {
            if (this.controller) {
                this.controller.set('selectedApiKey', null);
                this.controller.set('isApiKeyRegenerated', false);
            }
        });
    },

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
            .controllerFor('integrations')
            .integrationModelHook('slug', 'zapier', this, transition);
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Zapier'
        };
    }
});
