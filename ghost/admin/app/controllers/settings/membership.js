import Controller from '@ember/controller';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {currencies, getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
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

    portalPreviewGuid = Date.now().valueOf();

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

    get isConnectDisallowed() {
        const siteUrl = this.config.get('blogUrl');
        return envConfig.environment !== 'development' && !/^https:/.test(siteUrl);
    }

    get hasChangedPrices() {
        if (this.product) {
            this.stripePrices = this.product.get('stripePrices') || [];
            const activePrices = this.stripePrices.filter(price => !!price.active);
            const monthlyPrice = this.getPrice(activePrices, 'monthly');
            const yearlyPrice = this.getPrice(activePrices, 'yearly');

            if (monthlyPrice?.amount && parseInt(this.stripeMonthlyAmount, 10) !== (monthlyPrice.amount / 100)) {
                return true;
            }
            if (yearlyPrice?.amount && parseInt(this.stripeYearlyAmount, 10) !== (yearlyPrice.amount / 100)) {
                return true;
            }
        }

        return false;
    }

    @action
    setup() {
        this.fetchDefaultProduct.perform();
        this.updatePortalPreview();
    }

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes') || this.hasChangedPrices) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveRouteModal = true;
        }
    }

    @action
    async confirmLeave() {
        this.settings.rollbackAttributes();
        this.resetPrices();
        this.leaveSettingsTransition.retry();
    }

    @action
    cancelLeave() {
        this.showLeaveRouteModal = false;
        this.leaveSettingsTransition = null;
    }

    @action
    async membersSubscriptionAccessChanged() {
        const oldValue = this.settings.changedAttributes().membersSignupAccess?.[0];

        if (oldValue === 'none') {
            // when saved value is 'none' the server won't inject the portal script
            // to work around that and show the expected portal preview we save and
            // force a refresh
            await this.switchFromNoneTask.perform();
        } else {
            this.updatePortalPreview();
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
    validateStripePlans({updatePortalPreview = true} = {}) {
        this.stripePlanError = undefined;

        try {
            const yearlyAmount = this.stripeYearlyAmount;
            const monthlyAmount = this.stripeMonthlyAmount;
            const symbol = getSymbol(this.currency);
            if (!yearlyAmount || yearlyAmount < 1 || !monthlyAmount || monthlyAmount < 1) {
                throw new TypeError(`Subscription amount must be at least ${symbol}1.00`);
            }

            if (updatePortalPreview) {
                this.updatePortalPreview();
            }
        } catch (err) {
            this.stripePlanError = err.message;
        }
    }

    @action
    openStripeConnect() {
        this.stripeEnabledOnOpen = this.membersUtils.isStripeEnabled;
        this.showStripeConnect = true;
    }

    @action
    async closeStripeConnect() {
        if (this.stripeEnabledOnOpen !== this.membersUtils.isStripeEnabled) {
            await this.saveSettingsTask.perform({forceRefresh: true});
        }
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
    updatePortalPreview({forceRefresh} = {}) {
        // TODO: can these be worked out from settings in membersUtils?
        const monthlyPrice = this.stripeMonthlyAmount * 100;
        const yearlyPrice = this.stripeYearlyAmount * 100;
        let portalPlans = this.settings.get('portalPlans') || [];
        const currentMontlyPriceId = this.settings.get('membersMonthlyPriceId');
        const currentYearlyPriceId = this.settings.get('membersYearlyPriceId');
        let isMonthlyChecked = false;
        let isYearlyChecked = false;
        if (portalPlans.includes(currentMontlyPriceId)) {
            isMonthlyChecked = true;
        }

        if (portalPlans.includes(currentYearlyPriceId)) {
            isYearlyChecked = true;
        }

        const newUrl = new URL(this.membersUtils.getPortalPreviewUrl({
            button: false,
            monthlyPrice,
            yearlyPrice,
            currency: this.currency,
            isMonthlyChecked,
            isYearlyChecked,
            portalPlans: null
        }));

        if (forceRefresh) {
            this.portalPreviewGuid = Date.now().valueOf();
        }
        newUrl.searchParams.set('v', this.portalPreviewGuid);

        this.portalPreviewUrl = newUrl;

        this.resizePortalPreviewTask.perform();
    }

    @action
    portalPreviewLoaded(iframe) {
        this.portalPreviewIframe = iframe;
        this.resizePortalPreviewTask.perform();
    }

    @action
    portalPreviewDestroyed() {
        this.portalPreviewIframe = null;
        this.resizePortalPreviewTask.cancelAll();
    }

    @task
    *switchFromNoneTask() {
        return yield this.saveSettingsTask.perform({forceRefresh: true});
    }

    @task({restartable: true})
    *resizePortalPreviewTask() {
        if (this.portalPreviewIframe && this.portalPreviewIframe.contentWindow) {
            yield timeout(100); // give time for portal to re-render

            const portalIframe = this.portalPreviewIframe.contentWindow.document.querySelector('#ghost-portal-root iframe');
            if (!portalIframe) {
                return;
            }

            portalIframe.contentWindow.document.body.style.overflow = 'hidden';
            portalIframe.contentWindow.document.body.style['scrollbar-width'] = 'none';

            const portalContainer = portalIframe.contentWindow.document.querySelector('.gh-portal-popup-container');
            if (!portalContainer) {
                return;
            }

            const height = portalContainer.clientHeight;
            this.portalPreviewIframe.parentNode.style.height = `${height}px`;
        }
    }

    async saveProduct() {
        const isStripeConnected = this.settings.get('stripeConnectAccountId');
        if (this.product && isStripeConnected) {
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
                this.updatePortalPlans(monthlyPrice.id, yearlyPrice.id);
                this.settings.set('membersMonthlyPriceId', monthlyPrice.id);
                this.settings.set('membersYearlyPriceId', yearlyPrice.id);
                return this.product;
            } else {
                this.product.set('stripePrices', stripePrices);
                const savedProduct = await this.product.save();
                const updatedStripePrices = savedProduct.stripePrices || [];
                const updatedMonthlyPrice = getActivePrice(updatedStripePrices, 'month', monthlyAmount);
                const updatedYearlyPrice = getActivePrice(updatedStripePrices, 'year', yearlyAmount);
                this.updatePortalPlans(updatedMonthlyPrice.id, updatedYearlyPrice.id);
                this.settings.set('membersMonthlyPriceId', updatedMonthlyPrice.id);
                this.settings.set('membersYearlyPriceId', updatedYearlyPrice.id);
                return savedProduct;
            }
        }
    }

    updatePortalPlans(monthlyPriceId, yearlyPriceId) {
        let portalPlans = this.settings.get('portalPlans') || [];
        const currentMontlyPriceId = this.settings.get('membersMonthlyPriceId');
        const currentYearlyPriceId = this.settings.get('membersYearlyPriceId');
        if (portalPlans.includes(currentMontlyPriceId)) {
            portalPlans = portalPlans.filter(priceId => priceId !== currentMontlyPriceId);
            portalPlans.pushObject(monthlyPriceId);
        }

        if (portalPlans.includes(currentYearlyPriceId)) {
            portalPlans = portalPlans.filter(priceId => priceId !== currentYearlyPriceId);
            portalPlans.pushObject(yearlyPriceId);
        }
        this.settings.set('portalPlans', portalPlans);
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
            this.updatePortalPreview();
        }
    }

    @task({drop: true})
    *saveSettingsTask(options) {
        yield this.validateStripePlans({updatePortalPreview: false});

        if (this.stripePlanError) {
            return;
        }

        if (this.settings.get('errors').length !== 0) {
            return;
        }

        yield this.saveProduct();
        const result = yield this.settings.save();

        this.updatePortalPreview(options);

        return result;
    }

    resetPrices() {
        const activePrices = this.stripePrices.filter(price => !!price.active);
        const monthlyPrice = this.getPrice(activePrices, 'monthly');
        const yearlyPrice = this.getPrice(activePrices, 'yearly');

        this.stripeMonthlyAmount = monthlyPrice ? (monthlyPrice.amount / 100) : 5;
        this.stripeYearlyAmount = yearlyPrice ? (yearlyPrice.amount / 100) : 50;
    }

    reset() {
        this.showLeaveRouteModal = false;
        this.showLeavePortalModal = false;
        this.showPortalSettings = false;
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
}
