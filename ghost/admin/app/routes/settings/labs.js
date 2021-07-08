import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),
    notifications: service(),

    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);
        this.transitionEditor(this.session.user);
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
