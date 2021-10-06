import Controller from '@ember/controller';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersController extends Controller {
    @tracked offers = [];

    constructor() {
        super(...arguments);
    }

    get offersExist() {
        return this.offers.length > 0;
    }

    get offersList() {
        const offersList = this.offers.map((offer) => {
            return {
                offerModel: offer,
                ...offer.toJSON(),
                duration: offer.duration || 'Once',
                cadenceInterval: offer.cadence === 'year' ? 'Yearly' : 'Monthly'
            };
        });
        return offersList;
    }

    @task({restartable: true})
    *fetchOffersTask() {
        this.offers = yield this.store.query('offer', {limit: 'all'});
    }
}
