import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersController extends Controller {
    @tracked offers = [];
    @service modals;

    constructor() {
        super(...arguments);
    }

    get offersExist() {
        return this.offers.length > 0;
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
