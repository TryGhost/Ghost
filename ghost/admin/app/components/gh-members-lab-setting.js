import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    subscriptionSettings: computed('settings.membersSubscriptionSettings', function () {
        let subscriptionSettings = this.parseSubscriptionSettings(this.get('settings.membersSubscriptionSettings'));
        let stripeProcessor = subscriptionSettings.paymentProcessors.find((proc) => {
            return (proc.adapter === 'stripe');
        });
        let monthlyPlan = stripeProcessor.config.plans.find(plan => plan.interval === 'month');
        let yearlyPlan = stripeProcessor.config.plans.find(plan => plan.interval === 'year');
        monthlyPlan.dollarAmount = parseInt(monthlyPlan.amount) ? (monthlyPlan.amount / 100) : 0;
        yearlyPlan.dollarAmount = parseInt(yearlyPlan.amount) ? (yearlyPlan.amount / 100) : 0;
        stripeProcessor.config.plans = {
            monthly: monthlyPlan,
            yearly: yearlyPlan
        };
        subscriptionSettings.stripeConfig = stripeProcessor.config;
        subscriptionSettings.allowSelfSignup = !!subscriptionSettings.allowSelfSignup;
        subscriptionSettings.fromAddress = subscriptionSettings.fromAddress || 'noreply';

        return subscriptionSettings;
    }),

    defaultContentVisibility: computed('settings.defaultContentVisibility', function () {
        return this.get('settings.defaultContentVisibility');
    }),

    actions: {
        setDefaultContentVisibility(value) {
            this.setDefaultContentVisibility(value);
        },
        setSubscriptionSettings(key, event) {
            let subscriptionSettings = this.parseSubscriptionSettings(this.get('settings.membersSubscriptionSettings'));
            let stripeProcessor = subscriptionSettings.paymentProcessors.find((proc) => {
                return (proc.adapter === 'stripe');
            });
            let stripeConfig = stripeProcessor.config;
            stripeConfig.product = {
                name: this.settings.get('title')
            };
            // TODO: this flag has to be removed as it doesn't serve any purpose
            if (key === 'isPaid') {
                subscriptionSettings.isPaid = event;
            }
            if (key === 'secret_token' || key === 'public_token') {
                stripeConfig[key] = event.target.value;
            }
            if (key === 'month' || key === 'year') {
                stripeConfig.plans = stripeConfig.plans.map((plan) => {
                    if (key === plan.interval) {
                        plan.amount = parseInt(event.target.value) ? (event.target.value * 100) : 0;
                    }
                    return plan;
                });
            }
            if (key === 'allowSelfSignup') {
                subscriptionSettings.allowSelfSignup = !subscriptionSettings.allowSelfSignup;
            }
            if (key === 'fromAddress') {
                subscriptionSettings.fromAddress = event.target.value;
            }
            this.setMembersSubscriptionSettings(subscriptionSettings);
        }
    },

    parseSubscriptionSettings(settingsString) {
        try {
            return JSON.parse(settingsString);
        } catch (e) {
            return {
                isPaid: false,
                allowSelfSignup: true,
                fromAddress: 'noreply',
                paymentProcessors: [{
                    adapter: 'stripe',
                    config: {
                        secret_token: '',
                        public_token: '',
                        product: {
                            name: this.settings.get('title')
                        },
                        plans: [
                            {
                                name: 'Monthly',
                                currency: 'usd',
                                interval: 'month',
                                amount: ''
                            },
                            {
                                name: 'Yearly',
                                currency: 'usd',
                                interval: 'year',
                                amount: ''
                            }
                        ]
                    }
                }]
            };
        }
    }

});
