import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import injectService from 'ember-service/inject';

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
    }
});
