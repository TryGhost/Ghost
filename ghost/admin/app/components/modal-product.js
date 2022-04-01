import EmberObject, {action} from '@ember/object';
import ModalBase from 'ghost-admin/components/modal-base';
import ProductBenefitItem from '../models/product-benefit-item';
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
export default class ModalProductPrice extends ModalBase {
    @service settings;
    @service config;
    @tracked model;
    @tracked product;
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

    accentColorStyle = '';

    confirm() {}

    get isFreeProduct() {
        return this.product.type === 'free';
    }

    get allCurrencies() {
        return getCurrencyOptions();
    }

    get productCurrency() {
        if (this.isFreeProduct) {
            const firstPaidProduct = this.model.products?.find((product) => {
                return product.type === 'paid';
            });
            return firstPaidProduct?.monthlyPrice?.currency || 'usd';
        } else {
            return this.product?.monthlyPrice?.currency;
        }
    }

    get selectedCurrency() {
        return CURRENCIES.findBy('value', this.currency);
    }

    init() {
        super.init(...arguments);
        this.product = this.model.product;
        const monthlyPrice = this.product.get('monthlyPrice');
        const yearlyPrice = this.product.get('yearlyPrice');
        if (monthlyPrice) {
            this.stripeMonthlyAmount = (monthlyPrice.amount / 100);
        }
        if (yearlyPrice) {
            this.stripeYearlyAmount = (yearlyPrice.amount / 100);
        }
        this.currency = this.productCurrency || 'usd';
        this.benefits = this.product.get('benefits') || emberA([]);
        this.newBenefit = ProductBenefitItem.create({
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
            this.model.product.welcomePageURL = path;
        } else {
            this.model.product.welcomePageURL = this.welcomePageURL.href;
        }
    }

    get siteUrl() {
        return this.config.get('blogUrl');
    }

    // eslint-disable-next-line no-dupe-class-members
    get welcomePageURL() {
        return this.model.product.welcomePageURL;
    }

    get title() {
        if (this.isExistingProduct) {
            if (this.isFreeProduct) {
                return `Edit free membership`;
            }
            return `Edit tier`;
        }
        return 'New tier';
    }

    get isExistingProduct() {
        return !this.model.product.isNew;
    }

    @action
    close(event) {
        this.reset();
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
        this.newBenefit = ProductBenefitItem.create({isNew: true, name: ''});
        const savedBenefits = this.product.benefits?.filter(benefit => !!benefit.id) || emberA([]);
        this.product.set('benefits', savedBenefits);
    }

    @task({drop: true})
    *saveProduct() {
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

        if (!this.isFreeProduct) {
            const monthlyAmount = Math.round(this.stripeMonthlyAmount * 100);
            const yearlyAmount = Math.round(this.stripeYearlyAmount * 100);
            this.product.set('monthlyPrice', {
                nickname: 'Monthly',
                amount: monthlyAmount,
                active: true,
                currency: this.currency,
                interval: 'month',
                type: 'recurring'
            });
            this.product.set('yearlyPrice', {
                nickname: 'Yearly',
                amount: yearlyAmount,
                active: true,
                currency: this.currency,
                interval: 'year',
                type: 'recurring'
            });
        }
        this.product.set('benefits', this.benefits.filter(benefit => !benefit.get('isBlank')));
        yield this.product.save();

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

        this.newBenefit = ProductBenefitItem.create({isNew: true, name: ''});
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
            this.product.set('benefits', this.benefits);
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
