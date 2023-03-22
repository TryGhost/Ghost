import Component from '@glimmer/component';
import {action} from '@ember/object';
import {currencies} from 'ghost-admin/utils/currency';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

const NO_OF_TOP_CURRENCIES = 5;

export default class StripeSettingsForm extends Component {
    @service ghostPaths;
    @service ajax;
    @service settings;
    @service membersUtils;
    @service store;

    @inject config;

    @tracked hasActiveStripeSubscriptions = false;
    @tracked showDisconnectStripeConnectModal = false;
    @tracked stripeConnectError = null;
    @tracked stripeConnectTestMode = false;
    @tracked stripeDirect = false;
    @tracked stripePlanInvalidAmount = false;

    @tracked _scratchStripeYearlyAmount = null;
    @tracked _scratchStripeMonthlyAmount = null;

    topCurrencies = currencies.slice(0, NO_OF_TOP_CURRENCIES).map((currency) => {
        return {
            value: currency.isoCode.toLowerCase(),
            label: `${currency.isoCode} - ${currency.name}`,
            isoCode: currency.isoCode
        };
    });

    currencies = currencies.slice(NO_OF_TOP_CURRENCIES, currencies.length).map((currency) => {
        return {
            value: currency.isoCode.toLowerCase(),
            label: `${currency.isoCode} - ${currency.name}`,
            isoCode: currency.isoCode
        };
    });

    allCurrencies = [
        {
            groupName: '—',
            options: this.topCurrencies
        },
        {
            groupName: '—',
            options: this.currencies
        }
    ];

    /** OLD **/
    get stripeDirectPublicKey() {
        return this.settings.stripePublishableKey;
    }
    get stripeDirectSecretKey() {
        return this.settings.stripeSecretKey;
    }

    get stripeConnectAccountId() {
        return this.settings.stripeConnectAccountId;
    }
    get stripeConnectAccountName() {
        return this.settings.stripeConnectDisplayName;
    }
    get stripeConnectLivemode() {
        return this.settings.stripeConnectLivemode;
    }

    get selectedCurrency() {
        return this.currencies.findBy('value', this.stripePlans.monthly.currency)
            || this.topCurrencies.findBy('value', this.stripePlans.monthly.currency);
    }

    get stripePlans() {
        const plans = this.settings.stripePlans;
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
    }

    get liveStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=live';
    }

    get testStripeConnectAuthUrl() {
        return this.ghostPaths.url.api('members/stripe_connect') + '?mode=test';
    }

    constructor() {
        super(...arguments);

        // Allow disabling stripe direct keys if stripe is still enabled, while the config is disabled
        this.updateStripeDirect();
    }

    @action
    setStripeDirectPublicKey(event) {
        this.settings.stripeProductName = this.settings.title;
        this.settings.stripePublishableKey = event.target.value;
    }

    @action
    setStripeDirectSecretKey(event) {
        this.settings.stripeProductName = this.settings.title;
        this.settings.stripeSecretKey = event.target.value;
    }

    @action
    setStripeConnectTestMode(event) {
        this.stripeConnectTestMode = event.target.checked;
    }

    @action
    setStripePlansCurrency(event) {
        const newCurrency = event.value;
        const updatedPlans = this.settings.stripePlans.map((plan) => {
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

        this.settings.stripePlans = updatedPlans;
        this._scratchStripeYearlyAmount = null;
        this._scratchStripeMonthlyAmount = null;
        this.validateStripePlans();
    }

    @action
    setStripeConnectIntegrationToken(event) {
        this.settings.stripeProductName = this.settings.title;
        this.args.setStripeConnectIntegrationTokenSetting(event.target.value);
    }

    @action
    openDisconnectStripeModal() {
        this.openDisconnectStripeConnectModalTask.perform();
    }

    @action
    closeDisconnectStripeModal() {
        this.showDisconnectStripeConnectModal = false;
    }

    @action
    disconnectStripeConnectIntegration() {
        this.disconnectStripeConnectIntegrationTask.perform();
    }

    @action
    updateStripeDirect() {
        // Allow disabling stripe direct keys if stripe is still enabled, while the config is disabled
        this.stripeDirect = this.config.stripeDirect
            || (this.membersUtils.isStripeEnabled && !this.settings.stripeConnectAccountId);
    }

    @action
    validateStripePlans() {
        this.settings.errors.remove('stripePlans');
        this.settings.hasValidated.removeObject('stripePlans');

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
                const minimum = Intl.NumberFormat(this.settings.locale, {
                    currency: selectedCurrency.isoCode,
                    style: 'currency'
                }).format(1);

                throw new TypeError(`Subscription amount must be at least ${minimum}`);
            }

            const updatedPlans = this.settings.stripePlans.map((plan) => {
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

            this.settings.stripePlans = updatedPlans;
        } catch (err) {
            this.settings.errors.add('stripePlans', err.message);
        } finally {
            this.settings.hasValidated.pushObject('stripePlans');
        }
    }

    @task({drop: true})
    *openDisconnectStripeConnectModalTask() {
        this.hasActiveStripeSubscriptions = false;
        if (!this.stripeConnectAccountId) {
            return;
        }
        const url = this.ghostPaths.url.api('/members/') + '?filter=status:paid&limit=0';
        const response = yield this.ajax.request(url);

        if (response?.meta?.pagination?.total !== 0) {
            this.hasActiveStripeSubscriptions = true;
            return;
        }
        this.showDisconnectStripeConnectModal = true;
    }

    @task
    *disconnectStripeConnectIntegrationTask() {
        const url = this.ghostPaths.url.api('/settings/stripe/connect');

        yield this.ajax.delete(url);
        yield this.settings.reload();

        this.args.reset?.();
        this.args.onDisconnected?.();
    }

    @task
    *saveTier() {
        const tiers = yield this.store.query('tier', {filter: 'type:paid', include: 'monthly_price, yearly_price'});
        const tier = tiers.firstObject;

        if (tier) {
            tier.monthlyPrice = 500;
            tier.yearlyPrice = 5000;
            tier.currency = 'usd';

            let pollTimeout = 0;
            /** To allow Stripe config to be ready in backend, we poll the save tier request */
            while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
                yield timeout(RETRY_PRODUCT_SAVE_POLL_LENGTH);

                try {
                    const updatedTier = yield tier.save();

                    // Reload in the background (no await here)
                    this.membersUtils.reload();
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
        return tier;
    }

    @task({drop: true})
    *saveStripeSettingsTask() {
        this.stripeConnectError = null;

        if (this.settings.stripeConnectIntegrationToken) {
            try {
                let response = yield this.settings.save();

                yield this.saveTier.perform();
                this.settings.portalPlans = ['free', 'monthly', 'yearly'];

                response = yield this.settings.save();

                this.args.onConnected?.();

                return response;
            } catch (error) {
                if (error.payload && error.payload.errors) {
                    this.stripeConnectError = 'Invalid secure key';
                    return false;
                }
                throw error;
            }
        } else {
            this.stripeConnectError = 'Please enter a secure key';
        }
    }

    @task({drop: true})
    *saveSettingsTask() {
        yield this.settings.save();
        this.updateStripeDirect();
        return this.settings;
    }
}
