import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, {
    settings: service(),

    titleToken: 'AMP',
    classNames: ['settings-view-integrations-amp'],

    beforeModel() {
        return this.settings.reload();
    },

    actions: {
        save() {
            this.get('controller').send('save');
        },

        willTransition(transition) {
            let controller = this.get('controller');
            let settings = controller.get('settings');
            let modelIsDirty = settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    }

});
