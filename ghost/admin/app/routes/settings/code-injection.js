import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default AdminRoute.extend({
    settings: service(),

    model() {
        return this.settings.reload();
    },

    deactivate() {
        this._super(...arguments);
        this.controller.set('leaveSettingsTransition', null);
        this.controller.set('showLeaveSettingsModal', false);
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let settings = this.settings;
            let modelIsDirty = settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Code injection'
        };
    }
});
