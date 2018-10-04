import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from '../../../mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: service(),

    titleToken: 'Slack',
    classNames: ['settings-view-integrations-slack'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(this.settings.reload());
    },

    actions: {
        save() {
            this.get('controller').send('save');
        },

        willTransition(transition) {
            let controller = this.get('controller');
            let settings = this.get('settings');
            let modelIsDirty = settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    }
});
