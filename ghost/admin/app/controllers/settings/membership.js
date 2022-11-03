import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import Controller from '@ember/controller';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {currencies, getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {inject} from 'ghost-admin/decorators/inject';
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

export default class MembersAccessController extends Controller {
    @service feature;
    @service membersUtils;
    @service modals;
    @service settings;
    @service store;
    @service session;

    @inject config;

    @tracked showPortalSettings = false;
    @tracked showStripeConnect = false;
    @tracked showTierModal = false;

    @tracked tier = null;
    @tracked tiers = null;
    @tracked tierModel = null;
    @tracked paidSignupRedirect;
    @tracked freeSignupRedirect;
    @tracked welcomePageURL;
    @tracked stripeMonthlyAmount = 5;
    @tracked stripeYearlyAmount = 50;
    @tracked currency = 'usd';
    @tracked stripePlanError = '';

    @tracked portalPreviewUrl = '';

    portalPreviewGuid = Date.now().valueOf();

    queryParams = ['showPortalSettings', 'verifyEmail'];
    @tracked verifyEmail = null;

    get freeTier() {
        return this.tiers?.find(tier => tier.type === 'free');
    }

    get paidTiers() {
        return this.tiers?.filter(tier => tier.type === 'paid');
    }

    get allCurrencies() {
        return getCurrencyOptions();
    }

    get siteUrl() {
        return this.config.blogUrl;
    }

    get selectedCurrency() {
        return CURRENCIES.findBy('value', this.currency);
    }

    get isConnectDisallowed() {
        const siteUrl = this.config.blogUrl;
        return envConfig.environment !== 'development' && !/^https:/.test(siteUrl);
    }

    get hasChangedPrices() {
        if (this.tier) {
            const monthlyPrice = this.tier.get('monthlyPrice');
            const yearlyPrice = this.tier.get('yearlyPrice');

            if (monthlyPrice?.amount && parseFloat(this.stripeMonthlyAmount) !== (monthlyPrice.amount / 100)) {
                return true;
            }
            if (yearlyPrice?.amount && parseFloat(this.stripeYearlyAmount) !== (yearlyPrice.amount / 100)) {
                return true;
            }
        }

        return false;
    }

    @action
    setup() {
        this.fetchTiers.perform();
        this.updatePortalPreview();
    }

    get isDirty() {
        return this.settings.hasDirtyAttributes || this.hasChangedPrices;
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
    setWelcomePageURL(url) {
        this.welcomePageURL = url;
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
    validateWelcomePageURL() {
        const siteUrl = this.siteUrl;

        if (this.welcomePageURL === undefined) {
            // Not initialised
            return;
        }

        if (this.welcomePageURL.href.startsWith(siteUrl)) {
            const path = this.welcomePageURL.href.replace(siteUrl, '');
            this.freeTier.welcomePageURL = path;
        } else {
            this.freeTier.welcomePageURL = this.welcomePageURL.href;
        }
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
    async openEditTier(tier) {
        this.tierModel = tier;
        this.showTierModal = true;
    }

    @action
    async openNewTier() {
        this.tierModel = this.store.createRecord('tier');
        this.showTierModal = true;
    }

    @action
    closeTierModal() {
        this.showTierModal = false;
    }

    @action
    openPortalSettings() {
        this.saveSettingsTask.perform();
        this.showPortalSettings = true;
    }

    @action
    async closePortalSettings() {
        const changedAttributes = this.settings.changedAttributes();

        if (changedAttributes && Object.keys(changedAttributes).length > 0) {
            const shouldClose = await this.modals.open(ConfirmUnsavedChangesModal);

            if (shouldClose) {
                this.settings.rollbackAttributes();
                this.showPortalSettings = false;
                this.updatePortalPreview();
            }
        } else {
            this.showPortalSettings = false;
            this.updatePortalPreview();
        }
    }

    @action
    updatePortalPreview({forceRefresh} = {forceRefresh: false}) {
        // TODO: can these be worked out from settings in membersUtils?
        const monthlyPrice = Math.round(this.stripeMonthlyAmount * 100);
        const yearlyPrice = Math.round(this.stripeYearlyAmount * 100);
        let portalPlans = this.settings.portalPlans || [];

        let isMonthlyChecked = portalPlans.includes('monthly');
        let isYearlyChecked = portalPlans.includes('yearly');

        const tiers = this.store.peekAll('tier');
        const portalTiers = tiers?.filter((tier) => {
            return tier.get('visibility') === 'public'
                && tier.get('active') === true
                && tier.get('type') === 'paid';
        }).map((tier) => {
            return tier.id;
        });

        const newUrl = new URL(this.membersUtils.getPortalPreviewUrl({
            button: false,
            monthlyPrice,
            yearlyPrice,
            portalTiers,
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
    }

    @action
    portalPreviewInserted(iframe) {
        this.portalPreviewIframe = iframe;

        if (!this.portalMessageListener) {
            this.portalMessageListener = (event) => {
                // don't resize membership portal preview when events fire in customize portal modal
                if (this.showPortalSettings) {
                    return;
                }

                const resizeEvents = ['portal-ready', 'portal-preview-updated'];
                if (resizeEvents.includes(event.data.type) && event.data.payload?.height && this.portalPreviewIframe?.parentNode) {
                    this.portalPreviewIframe.parentNode.style.height = `${event.data.payload.height}px`;
                }
            };

            window.addEventListener('message', this.portalMessageListener, true);
        }
    }

    @action
    portalPreviewDestroyed() {
        this.portalPreviewIframe = null;

        if (this.portalMessageListener) {
            window.removeEventListener('message', this.portalMessageListener);
        }
    }

    @action
    confirmTierSave() {
        this.updatePortalPreview({forceRefresh: true});
        return this.fetchTiers.perform();
    }

    @task
    *switchFromNoneTask() {
        return yield this.saveSettingsTask.perform({forceRefresh: true});
    }

    setupPortalTier(tier) {
        if (tier) {
            const monthlyPrice = tier.get('monthlyPrice');
            const yearlyPrice = tier.get('yearlyPrice');
            this.currency = tier.get('currency');
            if (monthlyPrice) {
                this.stripeMonthlyAmount = (monthlyPrice / 100);
            }
            if (yearlyPrice) {
                this.stripeYearlyAmount = (yearlyPrice / 100);
            }
            this.updatePortalPreview();
        }
    }

    @task({drop: true})
    *fetchTiers() {
        this.tiers = yield this.store.query('tier', {
            include: 'monthly_price,yearly_price,benefits'
        });
        this.tier = this.paidTiers.firstObject;
        this.setupPortalTier(this.tier);
    }

    @task({drop: true})
    *saveSettingsTask(options) {
        if (this.settings.errors.length !== 0) {
            return;
        }
        // When no filer is selected in `Specific tier(s)` option
        if (!this.settings.defaultContentVisibility) {
            return;
        }
        const result = yield this.settings.save();
        yield this.freeTier.save();
        this.updatePortalPreview(options);
        return result;
    }

    async saveTier() {
        const paidMembersEnabled = this.settings.paidMembersEnabled;
        if (this.tier && paidMembersEnabled) {
            const monthlyAmount = Math.round(this.stripeMonthlyAmount * 100);
            const yearlyAmount = Math.round(this.stripeYearlyAmount * 100);

            this.tier.set('monthlyPrice', monthlyAmount);
            this.tier.set('yearlyPrice', yearlyAmount);

            const savedTier = await this.tier.save();
            return savedTier;
        }
    }

    @action
    reset() {
        this.settings.rollbackAttributes();
        this.resetPrices();
        this.showLeavePortalModal = false;
        this.showPortalSettings = false;
    }

    resetPrices() {
        const monthlyPrice = this.tier.get('monthlyPrice');
        const yearlyPrice = this.tier.get('yearlyPrice');

        this.stripeMonthlyAmount = monthlyPrice ? (monthlyPrice.amount / 100) : 5;
        this.stripeYearlyAmount = yearlyPrice ? (yearlyPrice.amount / 100) : 50;
    }

    _validateSignupRedirect(url, type) {
        const siteUrl = this.config.blogUrl;
        let errMessage = `Please enter a valid URL`;
        this.settings.errors.remove(type);
        this.settings.hasValidated.removeObject(type);

        if (url === null) {
            this.settings.errors.add(type, errMessage);
            this.settings.hasValidated.pushObject(type);
            return false;
        }

        if (url === undefined) {
            // Not initialised
            return;
        }

        if (url.href.startsWith(siteUrl)) {
            const path = url.href.replace(siteUrl, '');
            this.settings[type] = path;
        } else {
            this.settings[type] = url.href;
        }
    }
}
