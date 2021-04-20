/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    settings: service(),

    actions: {
        setDefaultContentVisibility(value) {
            this.set('settings.defaultContentVisibility', value);
        },

        setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
            this.set('settings.stripeConnectIntegrationToken', stripeConnectIntegrationToken);
        }
    },

    saveSettings: task(function* () {
        const response = yield this.settings.save();
        // Reset from address value on save
        return response;
    }).drop(),

    reset() {
        // stripeConnectIntegrationToken is not a persisted value so we don't want
        // to keep it around across transitions
        this.settings.set('stripeConnectIntegrationToken', undefined);
    }
});
