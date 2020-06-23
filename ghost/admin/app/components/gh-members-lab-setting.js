import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';

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
    },
    {
        label: 'INR - Indian Rupee', value: 'inr'
    }
];

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),
    ghostPaths: service(),
    ajax: service(),
    settings: service(),

    currencies: null,
    showFromAddressConfirmation: false,
    showMembersModalSettings: false,

    // passed in actions
    setMembersSubscriptionSettings() {},
    setStripeConnectIntegrationTokenSetting() {},

    defaultContentVisibility: reads('settings.defaultContentVisibility'),

    stripeDirect: reads('config.stripeDirect'),

    stripeConnectIntegration: computed('settings.stripeConnectIntegration', function () {
        try {
            const integration = JSON.parse(this.get('settings.stripeConnectIntegration'));
            if (!integration || !integration.account_id) {
                return null;
            }

            return {
                id: integration.account_id,
                name: integration.display_name,
                livemode: integration.livemode
            };
        } catch (err) {
            return null;
        }
    }),

    selectedCurrency: computed('subscriptionSettings.stripeConfig.plans.monthly.currency', function () {
        return CURRENCIES.findBy('value', this.get('subscriptionSettings.stripeConfig.plans.monthly.currency'));
    }),

    disableUpdateFromAddressButton: computed('fromAddress', function () {
        const savedFromAddress = this.get('subscriptionSettings.fromAddress');
        if (savedFromAddress.indexOf('@') < 0 && this.blogDomain) {
            return (this.fromAddress === `${savedFromAddress}@${this.blogDomain}`);
        }
        return (this.fromAddress === savedFromAddress);
    }),

    blogDomain: computed('config.blogDomain', function () {
        let blogDomain = this.config.blogDomain || '';
        const domainExp = blogDomain.replace('https://', '').replace('http://', '').match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        return (domainExp && domainExp[1]) || '';
    }),

    mailgunRegion: computed('settings.bulkEmailSettings.baseUrl', function () {
        if (!this.settings.get('bulkEmailSettings.baseUrl')) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.get('bulkEmailSettings.baseUrl');
        });
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
        toggleFromAddressConfirmation() {
            this.toggleProperty('showFromAddressConfirmation');
        },

        closeMembersModalSettings() {
            this.set('showMembersModalSettings', false);
        },

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

        setFromAddress(fromAddress) {
            this.setFromAddress(fromAddress);
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
        },

        setStripeConnectIntegrationToken(key, event) {
            this.setStripeConnectIntegrationTokenSetting(event.target.value);
        },

        openDisconnectStripeModal() {
            this.openDisconnectStripeConnectModal.perform();
        },

        closeDisconnectStripeModal() {
            this.set('showDisconnectStripeConnectModal', false);
        },

        disconnectStripeConnectIntegration() {
            this.disconnectStripeConnectIntegration.perform();
        }
    },

    openDisconnectStripeConnectModal: task(function* () {
        this.set('hasActiveStripeSubscriptions', false);
        if (!this.get('stripeConnectIntegration')) {
            return;
        }
        const url = this.get('ghostPaths.url').api('/members/hasActiveStripeSubscriptions');
        const response = yield this.ajax.request(url);

        if (response.hasActiveStripeSubscriptions) {
            this.set('hasActiveStripeSubscriptions', true);
            return;
        }
        this.set('showDisconnectStripeConnectModal', true);
    }).drop(),

    disconnectStripeConnectIntegration: task(function* () {
        this.set('disconnectStripeError', false);
        const url = this.get('ghostPaths.url').api('/settings/stripe/connect');

        yield this.ajax.delete(url);
        yield this.settings.reload();
    }),

    saveStripeSettings: task(function* () {
        this.set('stripeConnectError', null);
        this.set('stripeConnectSuccess', null);
        if (this.get('settings.stripeConnectIntegrationToken')) {
            try {
                const response = yield this.settings.save();
                this.set('membersStripeOpen', false);
                this.set('stripeConnectSuccess', true);
                return response;
            } catch (error) {
                if (error.payload && error.payload.errors) {
                    this.set('stripeConnectError', 'Invalid secure key');
                    return false;
                }
                throw error;
            }
        } else {
            this.set('stripeConnectError', 'Please enter a secure key');
        }
    }).drop(),

    updateFromAddress: task(function* () {
        let url = this.get('ghostPaths.url').api('/settings/members/email');
        try {
            const response = yield this.ajax.post(url, {
                data: {
                    from_address: this.fromAddress
                }
            });
            this.toggleProperty('showFromAddressConfirmation');
            return response;
        } catch (e) {
            // Failed to send email, retry
            return false;
        }
    }).drop(),

    get liveStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=live';
    },

    get testStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=test';
    }
});
