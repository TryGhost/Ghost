import Component from '@glimmer/component';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {currencies, getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
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
    @tracked tier;
    @tracked loadingTier = false;

    get selectedCurrency() {
        return this.currencies.findBy('value', this.currency);
    }

    get allCurrencies() {
        return getCurrencyOptions();
    }

    get isConnectDisallowed() {
        const siteUrl = this.config.get('blogUrl');

        return envConfig.environment !== 'development' && !/^https:/.test(siteUrl);
    }

    get isFreeDisabled() {
        return this.settings.get('membersSignupAccess') !== 'all';
    }

    willDestroy() {
        super.willDestroy?.(...arguments);
        // clear any unsaved settings changes when going back/forward/closing
        this.args.updatePreview('');
    }

    @action
    setup() {
        this.fetchDefaultTier.perform();
        this.updatePreviewUrl();
    }

    @action
    backStep() {
        const tier = this.tier;
        const data = this.args.getData() || {};
        this.args.storeData({
            ...data,
            tier,
            isFreeChecked: this.isFreeChecked,
            isMonthlyChecked: this.isMonthlyChecked,
            isYearlyChecked: this.isYearlyChecked,
            monthlyAmount: this.stripeMonthlyAmount,
            yearlyAmount: this.stripeYearlyAmount,
            currency: this.currency
        });
        this.args.backStep();
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
        if (this.isConnectDisallowed) {
            this.args.nextStep();
        } else {
            yield this.validateStripePlans();

            if (this.stripePlanError) {
                return false;
            }
            const tier = this.tier;
            const data = this.args.getData() || {};
            this.args.storeData({
                ...data,
                tier,
                isFreeChecked: this.isFreeChecked,
                isMonthlyChecked: this.isMonthlyChecked,
                isYearlyChecked: this.isYearlyChecked,
                monthlyAmount: this.stripeMonthlyAmount,
                yearlyAmount: this.stripeYearlyAmount,
                currency: this.currency
            });
            this.args.nextStep();
        }
    }

    @task({drop: true})
    *fetchDefaultTier() {
        const storedData = this.args.getData();
        if (storedData?.tier) {
            this.tier = storedData.tier;

            if (storedData.isMonthlyChecked !== undefined) {
                this.isMonthlyChecked = storedData.isMonthlyChecked;
            }
            if (storedData.isYearlyChecked !== undefined) {
                this.isYearlyChecked = storedData.isYearlyChecked;
            }
            if (storedData.isFreeChecked !== undefined) {
                this.isFreeChecked = storedData.isFreeChecked;
            }
            if (storedData.currency !== undefined) {
                this.currency = storedData.currency;
            }
            this.stripeMonthlyAmount = storedData.monthlyAmount;
            this.stripeYearlyAmount = storedData.yearlyAmount;
        } else {
            const tiers = yield this.store.query('tier', {filter: 'type:paid', include: 'monthly_price,yearly_price'});
            this.tier = tiers.firstObject;

            let portalPlans = this.settings.get('portalPlans') || [];

            this.isMonthlyChecked = portalPlans.includes('monthly');
            this.isYearlyChecked = portalPlans.includes('yearly');
            this.isFreeChecked = portalPlans.includes('free');

            const monthlyPrice = this.tier.get('monthlyPrice');
            const yearlyPrice = this.tier.get('yearlyPrice');
            if (monthlyPrice && monthlyPrice.amount) {
                this.stripeMonthlyAmount = (monthlyPrice.amount / 100);
                this.currency = monthlyPrice.currency;
            }
            if (yearlyPrice && yearlyPrice.amount) {
                this.stripeYearlyAmount = (yearlyPrice.amount / 100);
            }
        }
        this.updatePreviewUrl();
    }

    updatePreviewUrl() {
        const options = {
            disableBackground: true,
            currency: this.selectedCurrency.value,
            monthlyPrice: Math.round(this.stripeMonthlyAmount * 100),
            yearlyPrice: Math.round(this.stripeYearlyAmount * 100),
            isMonthlyChecked: this.isMonthlyChecked,
            isYearlyChecked: this.isYearlyChecked,
            isFreeChecked: this.isFreeChecked,
            portalPlans: null
        };

        const url = this.membersUtils.getPortalPreviewUrl(options);
        this.args.updatePreview(url);
    }
}
