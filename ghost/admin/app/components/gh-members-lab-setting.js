import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    mailgunRegion: computed('settings.bulkEmailSettings.baseUrl', function () {
        if (!this.settings.get('bulkEmailSettings.baseUrl')) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.get('bulkEmailSettings.baseUrl');
        });
    }),

    blogDomain: computed('config.blogDomain', function () {
        let domain = this.config.blogDomain || '';
        const host = domain.replace('https://', '').replace('http://', '').split('/');
        return (host && host[0]) || '';
    }),

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
        subscriptionSettings.fromAddress = subscriptionSettings.fromAddress || '';

        return subscriptionSettings;
    }),

    bulkEmailSettings: computed('settings.bulkEmailSettings', function () {
        let bulkEmailSettings = this.get('settings.bulkEmailSettings') || {};
        const {apiKey = '', baseUrl = US.baseUrl, domain = ''} = bulkEmailSettings;
        return {apiKey, baseUrl, domain};
    }),

    hasBulkEmailConfig: computed('settings.bulkEmailSettings', function () {
        let bulkEmailSettings = this.get('settings.bulkEmailSettings');
        return !!bulkEmailSettings.isConfig;
    }),

    defaultContentVisibility: computed('settings.defaultContentVisibility', function () {
        return this.get('settings.defaultContentVisibility');
    }),

    init() {
        this._super(...arguments);
        this.set('mailgunRegions', [US, EU]);
    },

    actions: {
        setDefaultContentVisibility(value) {
            this.setDefaultContentVisibility(value);
        },
        setBulkEmailSettings(key, event) {
            let bulkEmailSettings = this.get('settings.bulkEmailSettings') || {};
            bulkEmailSettings[key] = event.target.value;
            if (!bulkEmailSettings.baseUrl) {
                set(bulkEmailSettings, 'baseUrl', US.baseUrl);
            }
            this.setBulkEmailSettings(bulkEmailSettings);
        },
        setBulkEmailRegion(region) {
            let bulkEmailSettings = this.get('settings.bulkEmailSettings') || {};
            set(bulkEmailSettings, 'baseUrl', region.baseUrl);
            this.setBulkEmailSettings(bulkEmailSettings);
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
