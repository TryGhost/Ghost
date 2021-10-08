import Controller, {inject as controller} from '@ember/controller';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {ghPriceAmount} from '../helpers/gh-price-amount';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class OffersController extends Controller {
    @controller offers;
    @service config;
    @service settings;
    @service store;
    @service notifications;

    @tracked cadences = [];
    @tracked products = [];
    @tracked showUnsavedChangesModal = false;

    @tracked durations = [
        {
            label: 'Forever',
            duration: 'forever'
        },
        {
            label: 'Once',
            duration: 'once'
        },
        {
            label: 'Multiple months',
            duration: 'repeating'
        }
    ];

    @tracked offertypes = [
        {
            label: '%',
            offertype: 'percent'
        },
        {
            label: 'USD',
            offertype: 'fixed'
        }
    ];

    leaveScreenTransition = null;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get offer() {
        return this.model;
    }

    set offer(offer) {
        this.model = offer;
    }

    get scratchOffer() {
        return {
            ...this.offer
        };
    }

    get cadence() {
        if (this.offer.tier && this.offer.cadence) {
            return `${this.offer.tier.id}-${this.offer.cadence}-${this.offer.currency}`;
        }
        return '';
    }

    get isDiscountSectionDisabled() {
        return !this.offer.isNew;
    }

    // Tasks -------------------------------------------------------------------

    @task({drop: true})
    *fetchProducts() {
        this.products = yield this.store.query('product', {include: 'monthly_price,yearly_price'});
        const cadences = [];
        this.products.forEach((product) => {
            let monthlyLabel;
            let yearlyLabel;
            const productCurrency = product.monthlyPrice.currency;
            const productCurrencySymbol = productCurrency.toUpperCase();

            monthlyLabel = `${product.name} - Monthly (${ghPriceAmount(product.monthlyPrice.amount)} ${productCurrencySymbol})`;
            yearlyLabel = `${product.name} - Yearly (${ghPriceAmount(product.yearlyPrice.amount)} ${productCurrencySymbol})`;

            cadences.push({
                label: monthlyLabel,
                name: `${product.id}-month-${productCurrency}`
            });

            cadences.push({
                label: yearlyLabel,
                name: `${product.id}-year-${productCurrency}`
            });
        });
        this.cadences = cadences;
        if (this.offer && !this.offer.tier) {
            this.updateCadence(this.cadences[0]?.name);
        }
    }

    @task({drop: true})
    *copyOfferUrl() {
        copyTextToClipboard(this.offerUrl);
        yield timeout(this.isTesting ? 50 : 500);
        return true;
    }

    @task({drop: true})
    *saveTask() {
        let {offer} = this;

        // if Cmd+S is pressed before the field loses focus make sure we're
        // saving the intended property values
        // let scratchProps = scratchOffer.getProperties(SCRATCH_PROPS);
        // offer.setProperties(scratchProps);

        try {
            yield offer.save();

            // replace 'offer.new' route with 'offer' route
            this.replaceRoute('offer', offer);

            return offer;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'offer.save'});
            }
        }
    }

    @task
    *fetchOfferTask(offerId) {
        this.isLoading = true;

        this.offer = yield this.store.queryRecord('offer', {
            id: offerId
        });

        this.isLoading = false;
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    @action
    leaveScreen() {
        this.offer.rollbackAttributes();
        return this.leaveScreenTransition.retry();
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.leaveScreenTransition = null;
            this.showUnsavedChangesModal = false;
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.leaveScreenTransition = transition;

            // if a save is running, wait for it to finish then transition
            if (this.save.isRunning) {
                return this.save.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.showUnsavedChangesModal = true;
        }
    }

    @action
    setup() {
        this.fetchProducts.perform();
        // this.fetchOfferTask.perform();
    }

    @action
    setProperty(propKey, value) {
        this._saveOfferProperty(propKey, value);
    }

    @action
    setDiscountType(discountType) {
        if (!this.isDiscountSectionDisabled) {
            this._saveOfferProperty('type', discountType);
        }
        if (this.offer.type === 'fixed' && this.offer.amount !== '') {
            this.offer.amount = this.offer.amount * 100;
        } else if (this.offer.amount !== '') {
            this.offer.amount = this.offer.amount / 100;
        }
    }

    @action
    setDiscountAmount(e) {
        let amount = e.target.value;
        if (this.offer.type === 'fixed' && amount !== '') {
            amount = parseInt(amount) * 100;
        }
        this._saveOfferProperty('amount', amount);
    }

    @action
    setOfferName(e) {
        this._saveOfferProperty('name', e.target.value);
    }

    @action
    setPortalTitle(e) {
        this._saveOfferProperty('displayTitle', e.target.value);
    }

    @action
    setPortalDescription(e) {
        this._saveOfferProperty('displayDescription', e.target.value);
    }

    @action
    setOfferCode(e) {
        this._saveOfferProperty('code', e.target.value);
    }

    @action
    setDurationInMonths(e) {
        this._saveOfferProperty('durationInMonths', e.target.value);
    }

    get offerUrl() {
        const code = this.offer?.code || '';
        if (code) {
            const siteUrl = this.config.get('blogUrl');
            return `${siteUrl}/${code}`;
        }
        return '';
    }

    get displayCurrency() {
        const tierId = this.offer?.tier?.id;
        if (!tierId) {
            return '$';
        }
        const product = this.products.findBy('id', tierId);
        const productCurrency = product?.monthlyPrice?.currency || 'usd';
        return getSymbol(productCurrency);
    }

    get currencyLength() {
        return this.displayCurrency.length;
    }

    @action
    updateCadence(cadence) {
        const [tierId, tierCadence, currency] = cadence.split('-');
        this.offer.tier = {
            id: tierId
        };
        this.offer.cadence = tierCadence;
        this.offer.currency = currency;
        const offerType = this.offer.type;
        this.offertypes = [
            {
                label: '%',
                offertype: 'percent'
            },
            {
                label: currency.toUpperCase(),
                offertype: 'fixed'
            }
        ];
        this.offer.type = offerType;
    }

    @action
    updateDuration(duration) {
        this._saveOfferProperty('duration', duration);
    }

    // Private -----------------------------------------------------------------

    _saveOfferProperty(propKey, newValue) {
        let currentValue = this.offer[propKey];

        // if (newValue && typeof newValue === 'string') {
        //     newValue = newValue.trim();
        // }

        // avoid modifying empty values and triggering inadvertant unsaved changes modals
        if (newValue !== false && !newValue && !currentValue) {
            return;
        }

        this.offer[propKey] = newValue;
    }
}
