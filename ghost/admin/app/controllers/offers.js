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

    @task({restartable: true})
    *fetchOffersTask() {
        this.offers = yield this.store.query('offer', {limit: 'all'});
    }
}
