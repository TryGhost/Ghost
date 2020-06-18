import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    settings: service(),
    confirm() {},

    subscriptionSettings: alias('model.subscriptionSettings'),
    stripeConnectIntegration: alias('model.stripeConnectIntegration'),

    isFreeChecked: computed('settings.{membersjsAllowedPlans.[],membersSubscriptionSettings}', function () {
        const allowSelfSignup = this.subscriptionSettings.allowSelfSignup;
        const allowedPlans = this.settings.get('membersjsAllowedPlans') || [];
        return (allowSelfSignup && allowedPlans.includes('free'));
    }),

    isStripeConfigured: computed('settings.{stripeConnectIntegration,membersSubscriptionSettings}', function () {
        const stripeConfig = this.subscriptionSettings.stripeConfig;
        const stripeIntegration = this.stripeConnectIntegration;
        return (!!stripeConfig.public_token && !!stripeConfig.secret_token) || stripeIntegration;
    }),

    isMonthlyChecked: computed('settings.membersjsAllowedPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('membersjsAllowedPlans') || [];
        return (this.isStripeConfigured && allowedPlans.includes('monthly'));
    }),

    isYearlyChecked: computed('settings.membersjsAllowedPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('membersjsAllowedPlans') || [];
        return (this.isStripeConfigured && allowedPlans.includes('yearly'));
    }),

    init() {
        this._super(...arguments);
    },

    actions: {
        toggleFreePlan(isChecked) {
            this.updateAllowedPlan('free', isChecked);
        },
        toggleMonthlyPlan(isChecked) {
            this.updateAllowedPlan('monthly', isChecked);
        },
        toggleYearlyPlan(isChecked) {
            this.updateAllowedPlan('yearly', isChecked);
        },
        toggleBeaconSetting(showBeacon) {
            this.settings.set('membersjsShowBeacon', showBeacon);
        },

        toggleSignupName(showSignupName) {
            this.settings.set('membersjsShowSignupName', showSignupName);
        },

        confirm() {
            return this.saveTask.perform();
        },

        isPlanSelected(plan) {
            const allowedPlans = this.settings.get('membersjsAllowedPlans');
            return allowedPlans.includes(plan);
        }
    },

    updateAllowedPlan(plan, isChecked) {
        const allowedPlans = this.settings.get('membersjsAllowedPlans') || [];

        if (!isChecked) {
            this.settings.set('membersjsAllowedPlans', allowedPlans.filter(p => p !== plan));
        } else {
            allowedPlans.push(plan);
            this.settings.set('membersjsAllowedPlans', [...allowedPlans]);
        }
    },

    saveTask: task(function* () {
        yield this.settings.save();
        this.closeModal();
    }).drop()
});
