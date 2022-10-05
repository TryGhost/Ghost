import Component from '@ember/component';
import {computed} from '@ember/object';
import {currencies} from 'ghost-admin/utils/currency';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

export default Component.extend({
    config: service(),
    ghostPaths: service(),
    ajax: service(),
    settings: service(),
    membersUtils: service(),
    store: service(),

    topCurrencies: null,
    currencies: null,
    allCurrencies: null,
    stripePlanInvalidAmount: false,
    _scratchStripeYearlyAmount: null,
    _scratchStripeMonthlyAmount: null,

    stripeDirect: false,

    // passed in actions
    setStripeConnectIntegrationTokenSetting() {},

    /** OLD **/
    stripeDirectPublicKey: reads('settings.stripePublishableKey'),
    stripeDirectSecretKey: reads('settings.stripeSecretKey'),

    stripeConnectAccountId: reads('settings.stripeConnectAccountId'),
    stripeConnectAccountName: reads('settings.stripeConnectDisplayName'),
    stripeConnectLivemode: reads('settings.stripeConnectLivemode'),

    selectedCurrency: computed('stripePlans.monthly.currency', function () {
        return this.currencies.findBy('value', this.get('stripePlans.monthly.currency')) || this.topCurrencies.findBy('value', this.get('stripePlans.monthly.currency'));
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

        // Allow disabling stripe direct keys if stripe is still enabled, while the config is disabled
        this.updateStripeDirect();

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
                options: this.topCurrencies
            },
            {
                groupName: '—',
                options: this.currencies
            }
        ]);
    },

    actions: {
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
        }
    },

    updateStripeDirect() {
        // Allow disabling stripe direct keys if stripe is still enabled, while the config is disabled
        this.set('stripeDirect', this.get('config.stripeDirect') || (this.get('membersUtils.isStripeEnabled') && !this.get('settings.stripeConnectAccountId')));
    },

    validateStripePlans() {
        this.get('settings.errors').remove('stripePlans');
        this.get('settings.hasValidated').removeObject('stripePlans');

        if (this._scratchStripeYearlyAmount === null) {
            this._scratchStripeYearlyAmount = this.stripePlans.yearly.amount;
        }
        if (this._scratchStripeMonthlyAmount === null) {
            this._scratchStripeMonthlyAmount = this.stripePlans.monthly.amount;
        }

        try {
            const selectedCurrency = this.selectedCurrency;
            const yearlyAmount = parseInt(this._scratchStripeYearlyAmount);
            const monthlyAmount = parseInt(this._scratchStripeMonthlyAmount);
            if (!yearlyAmount || yearlyAmount < 1 || !monthlyAmount || monthlyAmount < 1) {
                const minimum = Intl.NumberFormat(this.settings.get('locale'), {
                    currency: selectedCurrency.isoCode,
                    style: 'currency'
                }).format(1);

                throw new TypeError(`Subscription amount must be at least ${minimum}`);
            }

            const updatedPlans = this.get('settings.stripePlans').map((plan) => {
                if (plan.name !== 'Complimentary') {
                    let newAmount;
                    if (plan.interval === 'year') {
                        newAmount = Math.round(yearlyAmount * 100);
                    } else if (plan.interval === 'month') {
                        newAmount = Math.round(monthlyAmount * 100);
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
        if (!this.stripeConnectAccountId) {
            return;
        }
        const url = this.ghostPaths.url.api('/members/') + '?filter=status:paid&limit=0';
        const response = yield this.ajax.request(url);

        if (response?.meta?.pagination?.total !== 0) {
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

        this.onDisconnected?.();
    }),

    saveTier: task(function* () {
        const tiers = yield this.store.query('tier', {filter: 'type:paid', include: 'monthly_price, yearly_price'});
        this.tier = tiers.firstObject;
        if (this.tier) {
            this.tier.set('monthlyPrice', 500);
            this.tier.set('yearlyPrice', 5000);
            this.tier.set('currency', 'usd');
            let pollTimeout = 0;
            /** To allow Stripe config to be ready in backend, we poll the save tier request */
            while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
                yield timeout(RETRY_PRODUCT_SAVE_POLL_LENGTH);

                try {
                    const updatedTier = yield this.tier.save();
                    return updatedTier;
                } catch (error) {
                    if (error.payload?.errors && error.payload.errors[0].code === 'STRIPE_NOT_CONFIGURED') {
                        pollTimeout += RETRY_PRODUCT_SAVE_POLL_LENGTH;
                        // no-op: will try saving again as stripe is not ready
                        continue;
                    } else {
                        throw error;
                    }
                }
            }
        }
        return this.tier;
    }),

    saveStripeSettings: task(function* () {
        this.set('stripeConnectError', null);
        this.set('stripeConnectSuccess', null);
        if (this.get('settings.stripeConnectIntegrationToken')) {
            try {
                let response = yield this.settings.save();

                yield this.saveTier.perform();
                this.settings.set('portalPlans', ['free', 'monthly', 'yearly']);

                response = yield this.settings.save();

                this.set('stripeConnectSuccess', true);
                this.onConnected?.();

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

    saveSettings: task(function* () {
        const s = yield this.settings.save();
        this.updateStripeDirect();
        return s;
    }).drop(),

    get liveStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=live';
    },

    get testStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=test';
    }
});
