import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

const CURRENCIES = [
    {
        label: 'USD - US Dollar', value: 'usd'
    },
    {
        label: 'AUD - Australian Dollar', value: 'aud'
    },
    {
        label: 'CAD - Canadian Dollar', value: 'cad'
    },
    {
        label: 'EUR - Euro', value: 'eur'
    },
    {
        label: 'GBP - British Pound', value: 'gbp'
    }
];

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    currencies: null,

    // passed in actions
    setMembersSubscriptionSettings() {},

    defaultContentVisibility: reads('settings.defaultContentVisibility'),

    selectedCurrency: computed('subscriptionSettings.stripeConfig.plans.monthly.currency', function () {
        return CURRENCIES.findBy('value', this.get('subscriptionSettings.stripeConfig.plans.monthly.currency'));
    }),

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
        let subscriptionSettings = this.settings.parseSubscriptionSettings(this.get('settings.membersSubscriptionSettings'));
        let stripeProcessor = subscriptionSettings.paymentProcessors.find((proc) => {
            return (proc.adapter === 'stripe');
        });
        let monthlyPlan = stripeProcessor.config.plans.find(plan => plan.interval === 'month');
        let yearlyPlan = stripeProcessor.config.plans.find(plan => plan.interval === 'year' && plan.name !== 'Complimentary');

        // NOTE: need to be careful about division by zero if we introduce zero decimal currencies
        //       ref.: https://stripe.com/docs/currencies#zero-decimal
        monthlyPlan.amount = parseInt(monthlyPlan.amount) ? (monthlyPlan.amount / 100) : 0;
        yearlyPlan.amount = parseInt(yearlyPlan.amount) ? (yearlyPlan.amount / 100) : 0;

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

    init() {
        this._super(...arguments);
        this.set('mailgunRegions', [US, EU]);
        this.set('currencies', CURRENCIES);
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
            let subscriptionSettings = this.settings.parseSubscriptionSettings(this.get('settings.membersSubscriptionSettings'));
            let stripeProcessor = subscriptionSettings.paymentProcessors.find((proc) => {
                return (proc.adapter === 'stripe');
            });
            let stripeConfig = stripeProcessor.config;
            stripeConfig.product = {
                name: this.settings.get('title')
            };

            if (key === 'secret_token' || key === 'public_token') {
                stripeConfig[key] = event.target.value;
            }
            if (key === 'month' || key === 'year') {
                stripeConfig.plans = stripeConfig.plans.map((plan) => {
                    if (key === plan.interval && plan.name !== 'Complimentary') {
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

            if (key === 'currency') {
                stripeProcessor.config.plans.forEach((plan) => {
                    if (plan.name !== 'Complimentary') {
                        plan.currency = event.value;
                    }
                });

                // NOTE: need to keep Complimentary plans with all available currencies so they don't conflict
                //       when applied to members with existing subscriptions in different currencies (ref. https://stripe.com/docs/billing/customer#currency)
                let currentCurrencyComplimentary = stripeProcessor.config.plans.filter(plan => (plan.currency === event.value && plan.name === 'Complimentary'));

                if (!currentCurrencyComplimentary.length) {
                    let complimentary = {
                        name: 'Complimentary',
                        currency: event.value,
                        interval: 'year',
                        amount: '0'
                    };

                    stripeProcessor.config.plans.push(complimentary);
                }

                stripeProcessor.config.currency = event.value;
            }

            this.setMembersSubscriptionSettings(subscriptionSettings);
        }
    }
});
