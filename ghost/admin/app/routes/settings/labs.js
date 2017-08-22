import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as injectService} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: injectService(),

    titleToken: 'Settings - Labs',
    classNames: ['settings'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return this.get('settings').reload();
    },

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }
});
