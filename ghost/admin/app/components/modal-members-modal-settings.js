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

    isFreeChecked: computed('settings.{portalPlans.[],membersSubscriptionSettings}', function () {
        const allowSelfSignup = this.subscriptionSettings.allowSelfSignup;
        const allowedPlans = this.settings.get('portalPlans') || [];
        return (allowSelfSignup && allowedPlans.includes('free'));
    }),

    isStripeConfigured: computed('settings.{stripeConnectIntegration,membersSubscriptionSettings}', function () {
        const stripeConfig = this.subscriptionSettings.stripeConfig;
        const stripeIntegration = this.stripeConnectIntegration;
        return (!!stripeConfig.public_token && !!stripeConfig.secret_token) || stripeIntegration;
    }),

    isMonthlyChecked: computed('settings.portalPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return (this.isStripeConfigured && allowedPlans.includes('monthly'));
    }),

    isYearlyChecked: computed('settings.portalPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('portalPlans') || [];
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
        togglePortalButton(showBeacon) {
            this.settings.set('portalButton', showBeacon);
        },

        togglePortalName(showSignupName) {
            this.settings.set('portalName', showSignupName);
        },

        confirm() {
            return this.saveTask.perform();
        },

        isPlanSelected(plan) {
            const allowedPlans = this.settings.get('portalPlans');
            return allowedPlans.includes(plan);
        }
    },

    updateAllowedPlan(plan, isChecked) {
        const allowedPlans = this.settings.get('portalPlans') || [];

        if (!isChecked) {
            this.settings.set('portalPlans', allowedPlans.filter(p => p !== plan));
        } else {
            allowedPlans.push(plan);
            this.settings.set('portalPlans', [...allowedPlans]);
        }
    },

    saveTask: task(function* () {
        yield this.settings.save();
        this.closeModal();
    }).drop()
});
