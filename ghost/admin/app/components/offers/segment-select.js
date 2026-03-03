import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const RETENTION_OFFER_OPTIONS = [
    {
        cadence: 'month',
        id: 'retention:month',
        name: 'Monthly Retention'
    },
    {
        cadence: 'year',
        id: 'retention:year',
        name: 'Yearly Retention'
    }
];

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

    getOfferById(id) {
        return this.offers.find((offer) => {
            return offer.id === id;
        });
    }

    get selectedOptions() {
        const selectedIds = new Set((this.args.offers || []).map(offer => offer.id).filter(id => !!id));
        const selected = [];
        const consumedIds = new Set();
        const retentionCadenceOptions = this.flatOptions.filter(option => Array.isArray(option.offerIds));

        retentionCadenceOptions.forEach((option) => {
            if (option.offerIds.length > 0 && option.offerIds.every(id => selectedIds.has(id))) {
                selected.push(option);
                option.offerIds.forEach(id => consumedIds.add(id));
            }
        });

        selectedIds.forEach((id) => {
            if (consumedIds.has(id)) {
                return;
            }

            const option = this.flatOptions.find((flatOption) => {
                return !Array.isArray(flatOption.offerIds) && flatOption.id === id;
            });

            if (option) {
                selected.push(option);
                return;
            }

            const offer = this.getOfferById(id);
            if (offer) {
                selected.push({
                    id: offer.id,
                    name: offer.name,
                    class: 'segment-offer-redemptions-hidden'
                });
            }
        });

        return selected;
    }

    @action
    setSegment(options) {
        const offerIds = new Set();

        options.forEach((option) => {
            if (Array.isArray(option.offerIds)) {
                option.offerIds.forEach(id => offerIds.add(id));
                return;
            }

            if (option.id) {
                offerIds.add(option.id);
            }
        });

        const ids = Array.from(offerIds).reduce((result, id) => {
            const offer = this.getOfferById(id);

            if (!offer) {
                return result;
            }

            result.push({
                id,
                name: offer.name
            });

            return result;
        }, []);

        this.args.onChange?.(ids);
    }

    getRetentionOptions(offers) {
        const retentionOffersByCadence = {
            month: [],
            year: []
        };

        offers.forEach((offer) => {
            const redemptionType = offer.redemptionType;
            if (redemptionType !== 'retention') {
                return;
            }

            if (offer.cadence === 'month' || offer.cadence === 'year') {
                retentionOffersByCadence[offer.cadence].push(offer.id);
            }
        });

        return RETENTION_OFFER_OPTIONS
            .filter(definition => retentionOffersByCadence[definition.cadence].length > 0)
            .map(definition => ({
                name: definition.name,
                id: definition.id,
                offerIds: retentionOffersByCadence[definition.cadence],
                class: 'segment-offer-redemptions'
            }));
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];
        const retentionOffersEnabled = Boolean(this.feature.labs?.retentionOffers);

        const offers = yield this.store.findAll('offer');
        this.offers = offers;

        if (offers.length > 0) {
            const offersGroup = {
                groupName: 'Offers',
                options: []
            };

            offers.forEach((offer) => {
                if (retentionOffersEnabled && offer.redemptionType === 'retention') {
                    return;
                }

                offersGroup.options.push({
                    name: offer.name,
                    id: offer.id,
                    class: 'segment-offer-redemptions'
                });
            });

            if (retentionOffersEnabled) {
                offersGroup.options.push(...this.getRetentionOptions(offers));
            }

            if (offersGroup.options.length > 0) {
                options.push(offersGroup);
            }
        }

        this._options = options;
    }
}
