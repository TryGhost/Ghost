import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Apps - Slack',

    classNames: ['settings-view-apps-slack'],

    model() {
        return this.modelFor('settings.apps').get('slack.firstObject');
    },

    setupController(controller) {
        this._super(...arguments);

        controller.set('settings', this.modelFor('settings.apps'));
    }
});
