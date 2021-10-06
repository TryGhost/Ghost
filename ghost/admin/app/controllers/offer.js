import Controller, {inject as controller} from '@ember/controller';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {ghPriceAmount} from '../helpers/gh-price-amount';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class OffersController extends Controller {
    @controller offers;
    @service config;
    @service settings;
    @service store;
    @service notifications;

    @tracked cadences = [];
    @tracked products = [];
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
            duration: 'multiple-months'
        }
    ];
    @tracked selectedDuration = 'forever';
    @tracked displayCurrency = '$';
    @tracked currencyLength = 1;

    leaveScreenTransition = null;

    constructor() {
        super(...arguments);
        this.setup();
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
            return `${this.offer.tier.id}-${this.offer.cadence}`;
        }
        return '';
    }

    // Tasks -------------------------------------------------------------------

    @task({drop: true})
    *fetchProducts() {
        this.products = yield this.store.query('product', {include: 'monthly_price,yearly_price'});
        const cadences = [{
            label: 'Select',
            name: ''
        }];
        this.products.forEach((product) => {
            var label;
            let monthlyCurrency = getSymbol(product.monthlyPrice.currency);
            if (monthlyCurrency.length === 1) {
                label = `${product.name} - Monthly (${monthlyCurrency}${ghPriceAmount(product.monthlyPrice.amount)})`;
            } else {
                label = `${product.name} - Monthly (${ghPriceAmount(product.monthlyPrice.amount)} ${monthlyCurrency})`;
            }
            cadences.push({
                label: label,
                name: `${product.id}-month`
            });

            let yearlyCurrency = getSymbol(product.yearlyPrice.currency);
            if (yearlyCurrency.length === 1) {
                label = `${product.name} - Yearly (${yearlyCurrency}${ghPriceAmount(product.yearlyPrice.amount)})`;
            } else {
                label = `${product.name} - Yearly (${ghPriceAmount(product.yearlyPrice.amount)} ${yearlyCurrency})`;
            }
            cadences.push({
                label: label,
                name: `${product.id}-year`
            });
        });
        this.cadences = cadences;
    }

    @task
    copyOfferUrl() {
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
        this._saveOfferProperty('type', discountType);
        // this.offer.discountType = discountType;
    }

    @action
    setDiscountAmount(e) {
        this._saveOfferProperty('amount', e.target.value);
        // this.offer.discountAmount = e.target.value;
    }

    @action
    setOfferName(e) {
        this._saveOfferProperty('name', e.target.value);
        // this.offer.name = e.target.value;
    }

    @action
    setPortalTitle(e) {
        this._saveOfferProperty('displayTitle', e.target.value);
        // this.offer.portalTitle = e.target.value;
    }

    @action
    setPortalDescription(e) {
        this._saveOfferProperty('displayDescription', e.target.value);
        // this.offer.portalDescription = e.target.value;
    }

    @action
    setOfferCode(e) {
        this._saveOfferProperty('code', e.target.value);
        // this.offer.code = e.target.value;
    }

    @action
    setDurationInMonths(e) {
        this._saveOfferProperty('durationInMonths', e.target.value);
        // this.offer.durationInMonths = e.target.value;
    }

    @action
    updateCadence(cadence) {
        const [tierId, tierCadence] = cadence.split('-');
        this.offer.tier = {
            id: tierId
        };
        this.offer.cadence = tierCadence;
        // this._saveOfferProperty('cadence', cadence);
        // this.offer.cadence = cadence;

        let product = this.products.findBy('id', tierId);
        if (product) {
            if (tierCadence === 'year') {
                this.displayCurrency = getSymbol(product.yearlyPrice.currency);
            } else {
                this.displayCurrency = getSymbol(product.monthlyPrice.currency);
            }
        }
        this.currencyLength = this.displayCurrency.length;
    }

    @action
    updateDuration(duration) {
        this._saveOfferProperty('duration', duration);
        // this.offer.duration = duration;
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
