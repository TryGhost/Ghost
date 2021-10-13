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
        this.offers = yield this.store.query('offer', {limit: 'all'});
    }
}
