import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: service(),

    titleToken: 'AMP',
    classNames: ['settings-view-integrations-amp'],

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
            let modelIsDirty = this.settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    }

});
