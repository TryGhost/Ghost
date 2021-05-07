import Component from '@glimmer/component';
import {action} from '@ember/object';
import {currencies, getSymbol} from 'ghost-admin/utils/currency';
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

export default class GhLaunchWizardSetPricingComponent extends Component {
    @service config;
    @service membersUtils;
    @service settings;
    @service store;

    currencies = CURRENCIES;

    @tracked stripeMonthlyAmount = 5;
    @tracked stripeYearlyAmount = 50;
    @tracked currency = 'usd';
    @tracked isFreeChecked = true;
    @tracked isMonthlyChecked = true;
    @tracked isYearlyChecked = true;
    @tracked stripePlanError = '';
    @tracked product;

    get selectedCurrency() {
        return this.currencies.findBy('value', this.currency);
    }

    get disabled() {
        if (this.product) {
            return this.product.get('stripePrices') && this.product.get('stripePrices').length > 0;
        }
        return true;
    }

    get isPaidPriceDisabled() {
        return this.disabled || !this.membersUtils.isStripeEnabled;
    }

    get isFreeDisabled() {
        return this.disabled || this.settings.get('membersSignupAccess') !== 'all';
    }

    constructor() {
        super(...arguments);
        const storedData = this.args.getData();
        if (storedData && storedData.product) {
            this.updatePricesFromProduct(storedData.product);
        } else {
            this.stripeMonthlyAmount = 5;
            this.stripeYearlyAmount = 50;
        }
        this.updatePreviewUrl();
        this.fetchDefaultProduct();
    }

    updatePricesFromProduct(product) {
        if (product) {
            const prices = product.get('stripePrices') || [];
            const monthlyPrice = prices.find(d => d.nickname === 'Monthly');
            const yearlyPrice = prices.find(d => d.nickname === 'Yearly');
            if (monthlyPrice && monthlyPrice.amount) {
                this.stripeMonthlyAmount = (monthlyPrice.amount / 100);
                this.currency = monthlyPrice.currency;
            }
            if (yearlyPrice && yearlyPrice.amount) {
                this.stripeYearlyAmount = (yearlyPrice.amount / 100);
            }
        }
    }

    willDestroy() {
        // clear any unsaved settings changes when going back/forward/closing
        this.args.updatePreview('');
    }

    @action
    setStripePlansCurrency(event) {
        const newCurrency = event.value;
        this.currency = newCurrency;
        this.updatePreviewUrl();
    }

    @action
    toggleFreePlan(event) {
        this.isFreeChecked = event.target.checked;
        this.updatePreviewUrl();
    }

    @action
    toggleMonthlyPlan(event) {
        this.isMonthlyChecked = event.target.checked;
        this.updatePreviewUrl();
    }

    @action
    toggleYearlyPlan(event) {
        this.isYearlyChecked = event.target.checked;
        this.updatePreviewUrl();
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

            this.updatePreviewUrl();
        } catch (err) {
            this.stripePlanError = err.message;
        }
    }

    @task
    *saveAndContinue() {
        yield this.validateStripePlans();

        if (this.stripePlanError) {
            return false;
        }
        const product = this.getProduct();
        const data = this.args.getData() || {};
        this.args.storeData({
            ...data,
            product,
            isMonthlyChecked: this.isMonthlyChecked,
            isYearlyChecked: this.isYearlyChecked
        });
        this.args.nextStep();
    }

    getProduct() {
        if (this.product) {
            const stripePrices = this.product.stripePrices || [];
            if (stripePrices.length === 0 && this.stripeMonthlyAmount && this.stripeYearlyAmount) {
                stripePrices.push(
                    {
                        nickname: 'Monthly',
                        amount: this.stripeMonthlyAmount * 100,
                        active: 1,
                        currency: this.currency,
                        interval: 'month',
                        type: 'recurring'
                    },
                    {
                        nickname: 'Yearly',
                        amount: this.stripeYearlyAmount * 100,
                        active: 1,
                        currency: this.currency,
                        interval: 'month',
                        type: 'recurring'
                    }
                );
                this.product.set('stripePrices', stripePrices);
                return this.product;
            } else {
                return this.product;
            }
        }
        return null;
    }

    async fetchDefaultProduct() {
        const products = await this.store.query('product', {include: 'stripe_prices'});
        this.product = products.firstObject;
        if (this.product.get('stripePrices').length > 0) {
            const data = this.args.getData() || {};
            this.args.storeData({
                ...data,
                product: null
            });
        }
    }

    updatePreviewUrl() {
        const options = {
            disableBackground: true,
            currency: this.selectedCurrency.value,
            monthlyPrice: this.stripeMonthlyAmount * 100,
            yearlyPrice: this.stripeYearlyAmount * 100,
            isMonthlyChecked: this.isMonthlyChecked,
            isYearlyChecked: this.isYearlyChecked,
            isFreeChecked: this.isFreeChecked
        };

        const url = this.membersUtils.getPortalPreviewUrl(options);
        this.args.updatePreview(url);
    }
}
