import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMembersSegmentSelect extends Component {
    @service store;
    @service feature;

    @tracked _options = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get options() {
        if (this.args.hideOptionsWhenAllSelected) {
            const selectedSegments = this.selectedOptions.mapBy('segment');
            if (selectedSegments.includes('status:free') && selectedSegments.includes('status:-free')) {
                return this._options.filter(option => !option.groupName);
            }
        }

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
        const segments = (this.args.segment || '').split(',');
        return this.flatOptions.filter(option => segments.includes(option.segment));
    }

    @action
    setSegment(options) {
        const segment = options.mapBy('segment').join(',') || null;
        this.args.onChange?.(segment);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];

        if (!this.args.hideDefaultSegments) {
            options.push({
                name: 'Free members',
                segment: 'status:free',
                class: 'segment-status-free'
            }, {
                name: 'Paid members',
                segment: 'status:-free', // paid & comped
                class: 'segment-status-paid'
            });
        }

        // fetch all tiers w̶i̶t̶h̶ c̶o̶u̶n̶t̶s̶
        // TODO: add `include: 'count.members` to query once API supports
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all', include: 'monthly_price,yearly_price,benefits'});

        if (tiers.length > 0) {
            const activeTiersGroup = {
                groupName: 'Active tiers',
                options: []
            };

            const archivedTiersGroup = {
                groupName: 'Archived tiers',
                options: []
            };

            tiers.forEach((tier) => {
                const tierData = {
                    name: tier.name,
                    segment: `${tier.id}`,
                    count: tier.count?.members,
                    class: 'segment-tier'
                };

                if (tier.active) {
                    activeTiersGroup.options.push(tierData);
                } else {
                    archivedTiersGroup.options.push(tierData);
                }
            });

            options.push(activeTiersGroup);
            options.push(archivedTiersGroup);

            if (this.args.selectDefaultTier && !this.args.segment) {
                this.args.onChange?.(activeTiersGroup.options[0].segment);
            }
        }

        // fetch all labels w̶i̶t̶h̶ c̶o̶u̶n̶t̶s̶
        // TODO: add `include: 'count.members` to query once API is fixed
        const labels = yield this.store.query('label', {limit: 'all'});

        if (labels.length > 0 && !this.args.hideLabels) {
            const labelsGroup = {
                groupName: 'Labels',
                options: []
            };

            labels.forEach((label) => {
                labelsGroup.options.push({
                    name: label.name,
                    segment: `label:${label.slug}`,
                    count: label.count?.members,
                    class: 'segment-label'
                });
            });

            options.push(labelsGroup);
        }

        const offers = yield this.store.query('offer', {limit: 'all'});

        if (offers.length > 0) {
            const offersGroup = {
                groupName: 'Offers',
                options: []
            };

            offers.forEach((offer) => {
                offersGroup.options.push({
                    name: offer.name,
                    segment: `offer_redemptions:${offer.id}`,
                    count: offer.count?.members,
                    class: 'segment-offer'
                });
            });

            options.push(offersGroup);
        }

        this._options = options;
    }
}
