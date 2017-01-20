import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Apps - AMP',

    classNames: ['settings-view-apps-amp'],

    model() {
        return this.modelFor('settings.apps').get('amp');
    },

    setupController(controller) {
        this._super(...arguments);

        controller.set('settings', this.modelFor('settings.apps'));
    }
});
