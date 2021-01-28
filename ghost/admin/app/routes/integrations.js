import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    setupController(controller) {
        // kick off the background fetch of integrations so that we can
        // show the screen immediately
        controller.fetchIntegrations.perform();
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Integrations'
        };
    }
});
