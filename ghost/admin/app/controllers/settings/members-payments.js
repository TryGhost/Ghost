/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersPaymentsController extends Controller {
    @service settings;

    @tracked showLeaveSettingsModal = false;

    @action
    setDefaultContentVisibility(value) {
        this.settings.set('defaultContentVisibility', value);
    }

    @action
    setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
        this.settings.set('stripeConnectIntegrationToken', stripeConnectIntegrationToken);
    }

    @task({drop: true})
    *saveSettings() {
        return yield this.settings.save();
    }

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveSettingsModal = true;
        }
    }

    @action
    async confirmLeave() {
        this.settings.rollbackAttributes();
        this.showLeaveSettingsModal = false;
        this.leaveSettingsTransition.retry();
    }

    @action
    cancelLeave() {
        this.showLeaveSettingsModal = false;
        this.leaveSettingsTransition = null;
    }

    reset() {
        // stripeConnectIntegrationToken is not a persisted value so we don't want
        // to keep it around across transitions
        this.settings.set('stripeConnectIntegrationToken', undefined);
    }
}
