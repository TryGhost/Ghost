/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default Controller.extend({

    settings: service(),
    session: service(),

    queryParams: ['showPortalSettings', 'showBrandingModal'],

    showPortalSettings: false,
    showBrandingModal: false,
    showLeaveSettingsModal: false,

    tagName: '',

    actions: {
        openStripeSettings() {
            this.set('membersStripeOpen', true);
        },

        closePortalSettings() {
            const changedAttributes = this.settings.changedAttributes();
            if (changedAttributes && Object.keys(changedAttributes).length > 0) {
                this.set('showLeaveSettingsModal', true);
            } else {
                this.set('showPortalSettings', false);
            }
        },

        closeLeaveSettingsModal() {
            this.set('showLeaveSettingsModal', false);
        },

        leavePortalSettings() {
            this.settings.rollbackAttributes();
            this.set('showPortalSettings', false);
            this.set('showLeaveSettingsModal', false);
        },

        closeBrandingModal() {
            this.set('showBrandingModal', false);
        }
    }

});
