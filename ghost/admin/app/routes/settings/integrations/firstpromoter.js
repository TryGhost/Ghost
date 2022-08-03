import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default AdminRoute.extend({
    settings: service(),

    beforeModel() {
        this._super(...arguments);

        return this.settings.reload();
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let modelIsDirty = this.settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'FirstPromoter'
        };
    }

});
