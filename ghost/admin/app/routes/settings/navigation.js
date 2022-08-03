import $ from 'jquery';
import AdminRoute from 'ghost-admin/routes/admin';
import RSVP from 'rsvp';
import {inject as service} from '@ember/service';

export default AdminRoute.extend({
    settings: service(),

    model() {
        return RSVP.hash({
            settings: this.settings.reload()
        });
    },

    setupController() {
        this.controller.send('reset');
    },

    deactivate() {
        this._super(...arguments);
        this.controller.set('leaveSettingsTransition', null);
        this.controller.set('showLeaveSettingsModal', false);
    },

    actions: {
        save() {
            // since shortcuts are run on the route, we have to signal to the components
            // on the page that we're about to save.
            $('.page-actions .gh-btn-blue').focus();

            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let modelIsDirty = controller.dirtyAttributes;

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Navigation'
        };
    }
});
