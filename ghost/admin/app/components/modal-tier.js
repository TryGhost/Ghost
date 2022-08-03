import EmberObject, {action} from '@ember/object';
import ModalBase from 'ghost-admin/components/modal-base';
import TierBenefitItem from '../models/tier-benefit-item';
import classic from 'ember-classic-decorator';
import {currencies, getCurrencyOptions, getSymbol} from 'ghost-admin/utils/currency';
import {A as emberA} from '@ember/array';
import {htmlSafe} from '@ember/template';
import {isEmpty} from '@ember/utils';
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

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalTierPrice extends ModalBase {
    @service settings;
    @service config;
    @tracked model;
    @tracked tier;
    @tracked periodVal;
    @tracked stripeMonthlyAmount = 5;
    @tracked stripeYearlyAmount = 50;
    @tracked currency = 'usd';
    @tracked errors = EmberObject.create();
    @tracked stripePlanError = '';
    @tracked benefits = emberA([]);
    @tracked newBenefit = null;
    @tracked welcomePageURL;
    @tracked previewCadence = 'yearly';
    @tracked discountValue = 0;
    @tracked hasSaved = false;
    @tracked savedBenefits;

    accentColorStyle = '';

    confirm() {}

    get isFreeTier() {
        return this.tier.type === 'free';
    }

    get allCurrencies() {
        return getCurrencyOptions();
    }

    get selectedCurrency() {
        return CURRENCIES.findBy('value', this.currency);
    }

    init() {
        super.init(...arguments);
        this.tier = this.model.tier;
        this.savedBenefits = this.model.tier?.get('benefits');
        const monthlyPrice = this.tier.get('monthlyPrice');
        const yearlyPrice = this.tier.get('yearlyPrice');
        if (monthlyPrice) {
            this.stripeMonthlyAmount = (monthlyPrice / 100);
        }
        if (yearlyPrice) {
            this.stripeYearlyAmount = (yearlyPrice / 100);
        }
        this.currency = this.tier.get('currency') || 'usd';
        this.benefits = this.tier.get('benefits') || emberA([]);
        this.newBenefit = TierBenefitItem.create({
            isNew: true,
            name: ''
        });
        this.calculateDiscount();

        this.accentColorStyle = htmlSafe(`color: ${this.settings.get('accentColor')}`);
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
            this.model.tier.welcomePageURL = path;
        } else {
            this.model.tier.welcomePageURL = this.welcomePageURL.href;
        }
    }

    get siteUrl() {
        return this.config.get('blogUrl');
    }

    // eslint-disable-next-line no-dupe-class-members
    get welcomePageURL() {
        return this.model.tier.welcomePageURL;
    }

    get title() {
        if (this.isExistingTier) {
            if (this.isFreeTier) {
                return `Edit free membership`;
            }
            return `Edit tier`;
        }
        return 'New tier';
    }

    get isExistingTier() {
        return !this.model.tier.isNew;
    }

    @action
    close(event) {
        if (!this.hasSaved) {
            this.reset();
        }
        event?.preventDefault?.();
        this.closeModal();
    }
    @action
    setCurrency(event) {
        const newCurrency = event.value;
        this.currency = newCurrency;
    }
    @action
    setWelcomePageURL(url) {
        this.welcomePageURL = url;
    }

    reset() {
        this.newBenefit = TierBenefitItem.create({isNew: true, name: ''});
        const finalBenefits = this.savedBenefits || emberA([]);
        this.tier.set('benefits', finalBenefits);
    }

    @task({drop: true})
    *saveTier() {
        this.validatePrices();
        if (!isEmpty(this.errors) && Object.keys(this.errors).length > 0) {
            return;
        }
        if (this.stripePlanError) {
            return;
        }

        if (!this.newBenefit.get('isBlank')) {
            yield this.send('addBenefit', this.newBenefit);
        }

        if (!this.isFreeTier) {
            const monthlyAmount = Math.round(this.stripeMonthlyAmount * 100);
            const yearlyAmount = Math.round(this.stripeYearlyAmount * 100);
            this.tier.set('monthlyPrice', monthlyAmount);
            this.tier.set('yearlyPrice', yearlyAmount);
            this.tier.set('currency', this.currency);
        }
        this.tier.set('benefits', this.benefits.filter(benefit => !benefit.get('isBlank')));
        yield this.tier.save();
        this.hasSaved = true;
        yield this.confirm();
        this.send('closeModal');
    }

    validatePrices() {
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

    addNewBenefitItem(item) {
        item.set('isNew', false);
        this.benefits.pushObject(item);

        this.newBenefit = TierBenefitItem.create({isNew: true, name: ''});
    }

    calculateDiscount() {
        const discount = this.stripeMonthlyAmount ? 100 - Math.floor((this.stripeYearlyAmount / 12 * 100) / this.stripeMonthlyAmount) : 0;
        this.discountValue = discount > 0 ? discount : 0;
    }

    @action
    changeCadence(cadence) {
        this.previewCadence = cadence;
    }

    @action
    validateStripePlans() {
        this.calculateDiscount();
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

    actions = {
        addBenefit(item) {
            return item.validate().then(() => {
                this.addNewBenefitItem(item);
            });
        },
        focusItem() {
            // Focus on next benefit on enter
        },
        deleteBenefit(item) {
            if (!item) {
                return;
            }
            this.benefits.removeObject(item);
        },
        reorderItems() {
            this.tier.set('benefits', this.benefits);
        },
        updateLabel(label, benefitItem) {
            if (!benefitItem) {
                return;
            }

            if (benefitItem.get('name') !== label) {
                benefitItem.set('name', label);
            }
        },
        // noop - we don't want the enter key doing anything
        confirm() {},
        setAmount(amount) {
            this.price.amount = !isNaN(amount) ? parseInt(amount) : 0;
        },

        setCurrency(event) {
            const newCurrency = event.value;
            this.currency = newCurrency;
        },
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    };
}
