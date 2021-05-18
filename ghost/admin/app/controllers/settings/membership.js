import Controller from '@ember/controller';
import {action} from '@ember/object';
import {currencies, getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

const CURRENCIES = currencies.map((currency) => {
    return {
        value: currency.isoCode.toLowerCase(),
        label: `${currency.isoCode} - ${currency.name}`,
        isoCode: currency.isoCode
    };
});

export default class MembersAccessController extends Controller {
    @service config;
    @service membersUtils;
    @service settings;
    @service store;

    @tracked showLeavePortalModal = false;
    @tracked showLeaveRouteModal = false;
    @tracked showPortalSettings = false;
    @tracked showStripeConnect = false;

    @tracked product = null;
    @tracked stripePrices = [];
    @tracked paidSignupRedirect;
    @tracked freeSignupRedirect;
    @tracked stripeMonthlyAmount = 5;
    @tracked stripeYearlyAmount = 50;
    @tracked currency = 'usd';
    @tracked stripePlanError = '';

    @tracked portalPreviewUrl = '';

    queryParams = ['showPortalSettings'];

    get allCurrencies() {
        return getCurrencyOptions();
    }

    get siteUrl() {
        return this.config.get('blogUrl');
    }

    get selectedCurrency() {
        return CURRENCIES.findBy('value', this.currency);
    }

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveRouteModal = true;
        }
    }

    _validateSignupRedirect(url, type) {
        const siteUrl = this.config.get('blogUrl');
        let errMessage = `Please enter a valid URL`;
        this.settings.get('errors').remove(type);
        this.settings.get('hasValidated').removeObject(type);

        if (url === null) {
            this.settings.get('errors').add(type, errMessage);
            this.settings.get('hasValidated').pushObject(type);
            return false;
        }

        if (url === undefined) {
            // Not initialised
            return;
        }

        if (url.href.startsWith(siteUrl)) {
            const path = url.href.replace(siteUrl, '');
            this.settings.set(type, path);
        } else {
            this.settings.set(type, url.href);
        }
    }

    @action
    setStripePlansCurrency(event) {
        const newCurrency = event.value;
        this.currency = newCurrency;
    }

    @action
    setPaidSignupRedirect(url) {
        this.paidSignupRedirect = url;
    }

    @action
    setFreeSignupRedirect(url) {
        this.freeSignupRedirect = url;
    }

    @action
    validatePaidSignupRedirect() {
        return this._validateSignupRedirect(this.paidSignupRedirect, 'membersPaidSignupRedirect');
    }

    @action
    validateFreeSignupRedirect() {
        return this._validateSignupRedirect(this.freeSignupRedirect, 'membersFreeSignupRedirect');
    }

    @action
    validateStripePlans() {
        this.stripePlanError = undefined;

        try {
            const yearlyAmount = this.stripeYearlyAmount;
            const monthlyAmount = this.stripeMonthlyAmount;
            const symbol = getSymbol(this.currency);
            if (!yearlyAmount || yearlyAmount < 1 || !monthlyAmount || monthlyAmount < 1) {
                throw new TypeError(`Subscription amount must be at least ${symbol}1.00`);
            }

            this.updatePortalPreview();
        } catch (err) {
            this.stripePlanError = err.message;
        }
    }

    @action
    closeStripeConnect() {
        this.showStripeConnect = false;
    }

    @action
    openPortalSettings() {
        this.saveSettingsTask.perform();
        this.showPortalSettings = true;
    }

    @action
    closePortalSettings() {
        const changedAttributes = this.settings.changedAttributes();
        if (changedAttributes && Object.keys(changedAttributes).length > 0) {
            this.showLeavePortalModal = true;
        } else {
            this.showPortalSettings = false;
            this.updatePortalPreview();
        }
    }

    @action
    async confirmClosePortalSettings() {
        this.settings.rollbackAttributes();
        this.showPortalSettings = false;
        this.showLeavePortalModal = false;
        this.updatePortalPreview();
    }

    @action
    cancelClosePortalSettings() {
        this.showLeavePortalModal = false;
    }

    @action
    async confirmLeave() {
        this.settings.rollbackAttributes();
        this.leaveSettingsTransition.retry();
    }

    @action
    cancelLeave() {
        this.showLeaveRouteModal = false;
        this.leaveSettingsTransition = null;
    }

    @action
    updatePortalPreview() {
        // TODO: can these be worked out from settings in membersUtils?
        const monthlyPrice = this.stripeMonthlyAmount;
        const yearlyPrice = this.stripeYearlyAmount;

        this.portalPreviewUrl = this.membersUtils.getPortalPreviewUrl({
            button: false,
            monthlyPrice,
            yearlyPrice
        });
    }

    setup() {
        this.fetchDefaultProduct.perform();
        this.updatePortalPreview();
    }

    async saveProduct() {
        if (this.product) {
            const stripePrices = this.product.stripePrices || [];
            const monthlyAmount = this.stripeMonthlyAmount * 100;
            const yearlyAmount = this.stripeYearlyAmount * 100;
            const getActivePrice = (prices, type, amount) => {
                return prices.find((price) => {
                    return (
                        price.active && price.amount === amount && price.type === 'recurring' &&
                        price.interval === type && price.currency.toLowerCase() === this.currency.toLowerCase()
                    );
                });
            };
            const monthlyPrice = getActivePrice(stripePrices, 'month', monthlyAmount);
            const yearlyPrice = getActivePrice(stripePrices, 'year', yearlyAmount);

            if (!monthlyPrice) {
                stripePrices.push(
                    {
                        nickname: 'Monthly',
                        amount: monthlyAmount,
                        active: 1,
                        currency: this.currency,
                        interval: 'month',
                        type: 'recurring'
                    }
                );
            }
            if (!yearlyPrice) {
                stripePrices.push(
                    {
                        nickname: 'Yearly',
                        amount: this.stripeYearlyAmount * 100,
                        active: 1,
                        currency: this.currency,
                        interval: 'year',
                        type: 'recurring'
                    }
                );
            }
            if (monthlyPrice && yearlyPrice) {
                this.settings.set('membersMonthlyPriceId', monthlyPrice.id);
                this.settings.set('membersYearlyPriceId', yearlyPrice.id);
                return this.product;
            } else {
                this.product.set('stripePrices', stripePrices);
                const savedProduct = await this.product.save();
                const updatedStripePrices = savedProduct.stripePrices || [];
                const updatedMonthlyPrice = getActivePrice(updatedStripePrices, 'month', monthlyAmount);
                const updatedYearlyPrice = getActivePrice(updatedStripePrices, 'year', yearlyAmount);
                this.settings.set('membersMonthlyPriceId', updatedMonthlyPrice.id);
                this.settings.set('membersYearlyPriceId', updatedYearlyPrice.id);
                return savedProduct;
            }
        }
    }

    getPrice(prices, type) {
        const monthlyPriceId = this.settings.get('membersMonthlyPriceId');
        const yearlyPriceId = this.settings.get('membersYearlyPriceId');

        if (type === 'monthly') {
            return (
                prices.find(price => price.id === monthlyPriceId) ||
                prices.find(price => price.nickname === 'Monthly') ||
                prices.find(price => price.interval === 'month')
            );
        }

        if (type === 'yearly') {
            return (
                prices.find(price => price.id === yearlyPriceId) ||
                prices.find(price => price.nickname === 'Yearly') ||
                prices.find(price => price.interval === 'year')
            );
        }
        return null;
    }

    @task({drop: true})
    *fetchDefaultProduct() {
        const products = yield this.store.query('product', {include: 'stripe_prices'});
        this.product = products.firstObject;
        this.stripePrices = [];
        if (this.product) {
            this.stripePrices = this.product.get('stripePrices') || [];
            const activePrices = this.stripePrices.filter(price => !!price.active);
            const monthlyPrice = this.getPrice(activePrices, 'monthly');
            const yearlyPrice = this.getPrice(activePrices, 'yearly');
            if (monthlyPrice && monthlyPrice.amount) {
                this.stripeMonthlyAmount = (monthlyPrice.amount / 100);
                this.currency = monthlyPrice.currency;
            }
            if (yearlyPrice && yearlyPrice.amount) {
                this.stripeYearlyAmount = (yearlyPrice.amount / 100);
            }
        }
    }

    @task({drop: true})
    *saveSettingsTask() {
        yield this.validateStripePlans();

        if (this.stripePlanError) {
            return;
        }

        if (this.settings.get('errors').length !== 0) {
            return;
        }

        yield this.saveProduct();
        const result = yield this.settings.save();

        this.updatePortalPreview();

        return result;
    }

    reset() {
        this.showLeaveRouteModal = false;
        this.showLeavePortalModal = false;
        this.showPortalSettings = false;
    }
}
