import Controller from '@ember/controller';
import {action} from '@ember/object';
import {getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersAccessController extends Controller {
    @service settings;
    @service store;
    @service config;

    @tracked showLeavePortalModal = false;
    @tracked showLeaveRouteModal = false;
    @tracked showPortalSettings = false;

    @tracked product = null;
    @tracked stripePrices = [];
    @tracked paidSignupRedirect;
    @tracked freeSignupRedirect;
    @tracked stripeMonthlyAmount = 5;
    @tracked stripeYearlyAmount = 50;
    @tracked currency = 'usd';
    @tracked stripePlanError = '';

    queryParams = ['showPortalSettings'];

    constructor(...args) {
        super(...args);
        this.siteUrl = this.config.get('blogUrl');
        this.fetchDefaultProduct.perform();

        this.allCurrencies = getCurrencyOptions();
    }

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveRouteModal = true;
        }
    }

    _validateSignupRedirect(url, type) {
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

        if (url.href.startsWith(this.siteUrl)) {
            const path = url.href.replace(this.siteUrl, '');
            this.settings.set(type, path);
        } else {
            this.settings.set(type, url.href);
        }
    }

    @action openPortalSettings() {
        this.saveSettingsTask.perform();
        this.showPortalSettings = true;
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
        } catch (err) {
            this.stripePlanError = err.message;
        }
    }

    @action
    closePortalSettings() {
        const changedAttributes = this.settings.changedAttributes();
        if (changedAttributes && Object.keys(changedAttributes).length > 0) {
            this.showLeavePortalModal = true;
        } else {
            this.showPortalSettings = false;
        }
    }

    @action
    async confirmClosePortalSettings() {
        this.settings.rollbackAttributes();
        this.showPortalSettings = false;
        this.showLeavePortalModal = false;
    }

    @action
    cancelClosePortalSettings() {
        this.showLeavePortalModal = false;
    }

    @action
    openStripeSettings() {
        // Open stripe settings here
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

    saveProduct() {
        if (this.product) {
            const stripePrices = this.product.stripePrices || [];
            if (this.stripeMonthlyAmount && this.stripeYearlyAmount) {
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
                        interval: 'year',
                        type: 'recurring'
                    }
                );
                this.product.set('stripePrices', stripePrices);
                return this.product;
            } else {
                return this.product;
            }
        }
    }

    @task({drop: true})
    *fetchDefaultProduct() {
        const products = yield this.store.query('product', {include: 'stripe_prices'});
        this.product = products.firstObject;
        this.stripePrices = [];
        if (this.product) {
            this.stripePrices = this.product.get('stripePrices');
            const monthlyPrice = this.stripePrices.find(d => d.nickname === 'Monthly');
            const yearlyPrice = this.stripePrices.find(d => d.nickname === 'Yearly');
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
        return yield this.settings.save();
    }

    reset() {
        this.showLeaveRouteModal = false;
        this.showLeavePortalModal = false;
        this.showPortalSettings = false;
    }
}
