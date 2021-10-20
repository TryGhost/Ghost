import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

const TYPES = [{
    name: 'Active',
    value: 'active'
},{
    name: 'Archived',
    value: 'archived'
}];

export default class MembersController extends Controller {
    @service modals;
    @service router;

    @tracked offers = [];
    @tracked products = [];
    @tracked type = 'active';

    queryParams = [
        'type'
    ];

    constructor() {
        super(...arguments);
        this.availableTypes = TYPES;
    }

    get filteredOffers() {
        return this.offers.filter((offer) => {
            return offer.status === this.type;
        }).map((offer) => {
            const product = this.products.find((p) => {
                return p.id === offer.tier.id;
            });
            const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
            offer.finalCurrency = offer.currency || price.currency;
            offer.originalPrice = price.amount;
            offer.updatedPrice = offer.type === 'fixed' ? (price.amount - offer.amount) : (price.amount - ((price.amount * offer.amount) / 100));
            return offer;
        });
    }

    get offersExist() {
        return this.offers.length > 0;
    }

    get selectedType() {
        return this.type ? TYPES.find((d) => {
            return this.type === d.value;
        }) : TYPES[0];
    }

    @action
    onTypeChange(type) {
        this.type = type.value;
    }

    @action
    openLinkDialog(offer) {
        this.advancedModal = this.modals.open('modals/offers/link', {
            offer: offer
        }, {
            className: 'fullscreen-modal-action fullscreen-modal-wide'
        });
    }

    @task({restartable: true})
    *fetchOffersTask() {
        this.products = yield this.store.query('product', {include: 'monthly_price,yearly_price'});
        this.offers = yield this.store.query('offer', {limit: 'all'});
        return this.offers;
    }
}
