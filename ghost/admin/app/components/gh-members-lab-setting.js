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
    setStripeConnectIntegrationTokenSetting() {},

    defaultContentVisibility: reads('settings.defaultContentVisibility'),

    stripeDirect: reads('config.stripeDirect'),

    allowSelfSignup: reads('settings.membersAllowFreeSignup'),

    /** OLD **/
    stripeDirectPublicKey: reads('settings.stripePublishableKey'),
    stripeDirectSecretKey: reads('settings.stripeSecretKey'),

    stripeConnectAccountId: reads('settings.stripeConnectAccountId'),
    stripeConnectAccountName: reads('settings.stripeConnectAccountName'),
    stripeConnectLivemode: reads('settings.stripeConnectLivemode'),

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

    selectedCurrency: computed('stripePlans.monthly.currency', function () {
        return CURRENCIES.findBy('value', this.get('stripePlans.monthly.currency'));
    }),

    disableUpdateFromAddressButton: computed('fromAddress', function () {
        const savedFromAddress = this.get('settings.membersFromAddress') || '';
        if (savedFromAddress.includes('@') && this.blogDomain) {
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

    stripePlans: computed('settings.stripePlans', function () {
        const plans = this.settings.get('stripePlans');
        const monthly = plans.find(plan => plan.interval === 'month');
        const yearly = plans.find(plan => plan.interval === 'year' && plan.name !== 'Complimentary');

        return {
            monthly: {
                amount: parseInt(monthly.amount) / 100 || 0,
                currency: monthly.currency
            },
            yearly: {
                amount: parseInt(yearly.amount) / 100 || 0,
                yearly: yearly.currency
            }
        };
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

        toggleSelfSignup() {
            this.set('settings.membersAllowFreeSignup', !this.get('allowSelfSignup'));
        },

        setStripeDirectPublicKey(event) {
            this.set('settings.stripeProductName', this.get('settings.title'));
            this.set('settings.stripePublishableKey', event.target.value);
        },

        setStripeDirectSecretKey(event) {
            this.set('settings.stripeProductName', this.get('settings.title'));
            this.set('settings.stripeSecretKey', event.target.value);
        },

        setStripePlan(type, event) {
            const updatedPlans = this.get('settings.stripePlans').map((plan) => {
                if (plan.interval === type && plan.name !== 'Complimentary') {
                    const newAmount = parseInt(event.target.value) * 100 || 0;
                    return Object.assign({}, plan, {
                        amount: newAmount
                    });
                }
                return plan;
            });

            this.set('settings.stripePlans', updatedPlans);
        },

        setStripePlansCurrency(event) {
            const newCurrency = event.value;
            const updatedPlans = this.get('settings.stripePlans').map((plan) => {
                if (plan.name !== 'Complimentary') {
                    return Object.assign({}, plan, {
                        currency: newCurrency
                    });
                }
                return plan;
            });

            const currentComplimentaryPlan = updatedPlans.find((plan) => {
                return plan.name === 'Complimentary' && plan.currency === event.value;
            });

            if (!currentComplimentaryPlan) {
                updatedPlans.push({
                    name: 'Complimentary',
                    currency: event.value,
                    interval: 'year',
                    amount: 0
                });
            }

            this.set('settings.stripePlans', updatedPlans);
        },

        setStripeConnectIntegrationToken(event) {
            this.set('settings.stripeProductName', this.get('settings.title'));
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
