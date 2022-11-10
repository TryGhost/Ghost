import Controller from '@ember/controller';
import LinkOfferModal from '../components/modals/offers/link';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
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
    @service membersUtils;

    @tracked offers = [];
    @tracked tiers = [];
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
            const tier = this.tiers.find((p) => {
                return p.id === offer.tier.id;
            });
            const price = offer.cadence === 'month' ? tier.monthlyPrice : tier.yearlyPrice;
            return !!tier && tier.active && offer.status === this.type && !!price;
        }).map((offer) => {
            const tier = this.tiers.find((p) => {
                return p.id === offer.tier.id;
            });
            const price = offer.cadence === 'month' ? tier.monthlyPrice : tier.yearlyPrice;
            offer.finalCurrency = offer.currency || tier.currency;
            offer.originalPrice = price;
            if (offer.type !== 'trial') {
                offer.updatedPrice = offer.type === 'fixed' ? (price - offer.amount) : (price - ((price * offer.amount) / 100));
            } else {
                offer.updatedPrice = offer.originalPrice;
            }
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
        this.advancedModal = this.modals.open(LinkOfferModal, {
            offer: offer
        });
    }

    @task({restartable: true})
    *fetchOffersTask() {
        this.tiers = yield this.store.query('tier', {
            filter: 'type:paid', include: 'monthly_price,yearly_price'
        });
        this.offers = yield this.store.query('offer', {limit: 'all'});
        return this.offers;
    }
}
