import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class OffersSegmentSelect extends Component {
    @service store;
    @service feature;

    @tracked _options = [];
    @tracked offers = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get options() {
        return this._options;
    }

    get flatOptions() {
        const options = [];

        function getOptions(option) {
            if (option.options) {
                return option.options.forEach(getOptions);
            }

            options.push(option);
        }
        this._options.forEach(getOptions);
        return options;
    }

    get selectedOptions() {
        const offerList = (this.args.offers || []).map((offer) => {
            return this.offers.find((p) => {
                return p.id === offer.id || p.name === offer.name;
            });
        }).filter(d => !!d);
        const offerIdList = offerList.map(d => d.id);
        const selectedList = this.flatOptions.filter(option => offerIdList.includes(option.id));
        return selectedList;
    }

    @action
    setSegment(options) {
        let ids = options.mapBy('id').map((id) => {
            let offer = this.offers.find((p) => {
                return p.id === id;
            });
            return {
                id: offer.id,
                name: offer.name
            };
        }) || [];
        this.args.onChange?.(ids);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];

        // fetch all offers with count
        // TODO: add `include: 'count.members` to query once API supports
        const offers = yield this.store.query('offer', {filter: 'status:active'});
        this.offers = offers;
        if (offers.length > 0) {
            const offersGroup = {
                groupName: 'Offers',
                options: []
            };

            offers.forEach((offer) => {
                offersGroup.options.push({
                    name: offer.name,
                    id: offer.id,
                    count: offers.count?.members,
                    class: 'segment-offer-redemptions'
                });
            });
            options.push(offersGroup);
        }

        this._options = options;
    }
}
