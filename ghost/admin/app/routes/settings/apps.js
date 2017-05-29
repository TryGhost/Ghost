import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import injectService from 'ember-service/inject';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: injectService(),

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
