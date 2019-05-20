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

    model() {
        return this.settings.reload();
    },

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Labs'
        };
    }
});
