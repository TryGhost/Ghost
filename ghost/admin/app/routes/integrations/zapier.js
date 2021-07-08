import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    router: service(),
    config: service(),

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', () => {
            if (this.controller) {
                this.controller.set('selectedApiKey', null);
                this.controller.set('isApiKeyRegenerated', false);
            }
        });
    },

    disabled: computed('config.hostSettings.limits', function () {
        return this.config.get('hostSettings.limits.customIntegrations.disabled');
    }),

    beforeModel() {
        this._super(...arguments);

        this.transitionDisabled();
        this.transitionAuthor(this.session.user);
        this.transitionEditor(this.session.user);
    },

    model(params, transition) {
        // use the integrations controller to fetch all integrations and pick
        // out the one we want. Allows navigation back to integrations screen
        // without a loading state
        return this
            .controllerFor('integrations')
            .integrationModelHook('slug', 'zapier', this, transition);
    },

    transitionDisabled() {
        if (this.get('disabled')) {
            this.transitionTo('integrations');
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Zapier'
        };
    }
});
