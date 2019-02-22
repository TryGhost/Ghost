import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    infinity: service(),
    session: service(),

    titleToken: 'Staff',
    classNames: ['view-team'],

    model() {
        return this.session.user;
    },

    setupController(controller) {
        this._super(...arguments);
        controller.backgroundUpdate.perform();
    },

    actions: {
        reload() {
            this.controller.backgroundUpdate.perform();
        }
    }
});
