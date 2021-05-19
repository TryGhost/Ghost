/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default Controller.extend({

    settings: service(),
    session: service(),

    queryParams: ['showBrandingModal'],

    showBrandingModal: false,
    showLeaveSettingsModal: false,

    actions: {
        openStripeSettings() {
            this.set('membersStripeOpen', true);
        },

        closeLeaveSettingsModal() {
            this.set('showLeaveSettingsModal', false);
        },

        async leavePortalSettings() {
            this.settings.rollbackAttributes();
            this.set('showLeaveSettingsModal', false);
        },

        closeBrandingModal() {
            this.set('showBrandingModal', false);
        }
    }

});
