import Component from '@ember/component';
import {computed} from '@ember/object';
import {currencies} from 'ghost-admin/utils/currency';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),
    ghostPaths: service(),
    ajax: service(),
    settings: service(),

    topCurrencies: null,
    currencies: null,
    allCurrencies: null,
    stripePlanInvalidAmount: false,
    _scratchStripeYearlyAmount: null,
    _scratchStripeMonthlyAmount: null,
    showLeaveSettingsModal: false,

    // passed in actions
    setStripeConnectIntegrationTokenSetting() {},

    defaultContentVisibility: reads('settings.defaultContentVisibility'),

    stripeDirect: reads('config.stripeDirect'),

    allowSelfSignup: reads('settings.membersAllowFreeSignup'),

    /** OLD **/
    stripeDirectPublicKey: reads('settings.stripePublishableKey'),
    stripeDirectSecretKey: reads('settings.stripeSecretKey'),

    stripeConnectAccountId: reads('settings.stripeConnectAccountId'),
    stripeConnectAccountName: reads('settings.stripeConnectDisplayName'),
    stripeConnectLivemode: reads('settings.stripeConnectLivemode'),

    portalSettingsBorderColor: reads('settings.accentColor'),

    selectedCurrency: computed('stripePlans.monthly.currency', function () {
        return this.get('currencies').findBy('value', this.get('stripePlans.monthly.currency'));
    }),

    blogDomain: computed('config.blogDomain', function () {
        let blogDomain = this.config.blogDomain || '';
        const domainExp = blogDomain.replace('https://', '').replace('http://', '').match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        return (domainExp && domainExp[1]) || '';
    }),

    stripePlans: computed('settings.stripePlans', function () {
        const plans = this.settings.get('stripePlans');
        const monthly = plans.find(plan => plan.interval === 'month');
        const yearly = plans.find(plan => plan.interval === 'year' && plan.name !== 'Complimentary');

        return {
            monthly: {
                amount: parseInt(monthly.amount) / 100 || 5,
                currency: monthly.currency
            },
            yearly: {
                amount: parseInt(yearly.amount) / 100 || 50,
                currency: yearly.currency
            }
        };
    }),

    init() {
        this._super(...arguments);

        const noOfTopCurrencies = 5;
        this.set('topCurrencies', currencies.slice(0, noOfTopCurrencies).map((currency) => {
            return {
                value: currency.isoCode.toLowerCase(),
                label: `${currency.isoCode} - ${currency.name}`,
                isoCode: currency.isoCode
            };
        }));

        this.set('currencies', currencies.slice(noOfTopCurrencies, currencies.length).map((currency) => {
            return {
                value: currency.isoCode.toLowerCase(),
                label: `${currency.isoCode} - ${currency.name}`,
                isoCode: currency.isoCode
            };
        }));

        this.set('allCurrencies', [
            {
                groupName: '—',
                options: this.get('topCurrencies')
            },
            {
                groupName: '—',
                options: this.get('currencies')
            }
        ]);

        if (this.get('stripeConnectAccountId')) {
            this.set('membersStripeOpen', false);
        } else {
            this.set('membersStripeOpen', true);
        }
    },

    actions: {
        closePortalSettings() {
            const changedAttributes = this.settings.changedAttributes();
            if (changedAttributes && Object.keys(changedAttributes).length > 0) {
                this.set('showLeaveSettingsModal', true);
            } else {
                this.set('showPortalSettings', false);
            }
        },

        setDefaultContentVisibility(value) {
            this.setDefaultContentVisibility(value);
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

        validateStripePlans() {
            this.validateStripePlans();
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
            this.set('_scratchStripeYearlyAmount', null);
            this.set('_scratchStripeMonthlyAmount', null);
            this.validateStripePlans();
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
        },

        closeLeaveSettingsModal() {
            this.set('showLeaveSettingsModal', false);
        },

        leavePortalSettings() {
            this.settings.rollbackAttributes();
            this.set('showPortalSettings', false);
            this.set('showLeaveSettingsModal', false);
        },

        openStripeSettings() {
            this.set('membersStripeOpen', true);
        }
    },

    validateStripePlans() {
        this.get('settings.errors').remove('stripePlans');
        this.get('settings.hasValidated').removeObject('stripePlans');

        if (this._scratchStripeYearlyAmount === null) {
            this._scratchStripeYearlyAmount = this.get('stripePlans').yearly.amount;
        }
        if (this._scratchStripeMonthlyAmount === null) {
            this._scratchStripeMonthlyAmount = this.get('stripePlans').monthly.amount;
        }

        try {
            const selectedCurrency = this.selectedCurrency;
            const yearlyAmount = parseInt(this._scratchStripeYearlyAmount);
            const monthlyAmount = parseInt(this._scratchStripeMonthlyAmount);
            if (!yearlyAmount || yearlyAmount < 1 || !monthlyAmount || monthlyAmount < 1) {
                const minimum = Intl.NumberFormat(this.settings.get('lang'), {
                    currency: selectedCurrency.isoCode,
                    style: 'currency'
                }).format(1);

                throw new TypeError(`Subscription amount must be at least ${minimum}`);
            }

            const updatedPlans = this.get('settings.stripePlans').map((plan) => {
                if (plan.name !== 'Complimentary') {
                    let newAmount;
                    if (plan.interval === 'year') {
                        newAmount = yearlyAmount * 100;
                    } else if (plan.interval === 'month') {
                        newAmount = monthlyAmount * 100;
                    }
                    return Object.assign({}, plan, {
                        amount: newAmount
                    });
                }
                return plan;
            });

            this.set('settings.stripePlans', updatedPlans);
        } catch (err) {
            this.get('settings.errors').add('stripePlans', err.message);
        } finally {
            this.get('settings.hasValidated').pushObject('stripePlans');
        }
    },

    openDisconnectStripeConnectModal: task(function* () {
        this.set('hasActiveStripeSubscriptions', false);
        if (!this.get('stripeConnectAccountId')) {
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

    get liveStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=live';
    },

    get testStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=test';
    }
});
