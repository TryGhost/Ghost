import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: service(),

    titleToken: 'Settings - Apps',
    classNames: ['settings-view-apps'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    // we don't want to set the model property but we do want to ensure we have
    // up-to-date settings so pause via afterModel
    afterModel() {
        return this.get('settings').reload();
    }
});
