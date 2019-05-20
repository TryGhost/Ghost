import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from '../../../mixins/current-user-settings';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
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
            .integrationModelHook('slug', 'zapier', this, transition);
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Zapier'
        };
    }
});
