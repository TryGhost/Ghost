import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class VisibilitySegmentSelect extends Component {
    @service store;
    @service feature;

    @tracked _options = [];
    @tracked tiers = [];

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
        const tierList = this.args.tiers.map((tier) => {
            return this.tiers.find((p) => {
                return p.id === tier.id;
            });
        }).filter(d => !!d);
        const tierIdList = tierList.map(d => d.id);
        return this.flatOptions.filter(option => tierIdList.includes(option.id));
    }

    @action
    setSegment(options) {
        let ids = options.mapBy('id').map((id) => {
            let tier = this.tiers.find((p) => {
                return p.id === id;
            });
            return {
                id: tier.id,
                slug: tier.slug,
                name: tier.name
            };
        }) || [];
        this.args.onChange?.(ids);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];

        // fetch all tiers with count
        // TODO: add `include: 'count.members` to query once API supports
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all', include: 'monthly_price,yearly_price,benefits'});
        this.tiers = tiers;

        if (tiers.length > 0) {
            const tiersGroup = {
                groupName: 'Tiers',
                options: []
            };

            tiers.forEach((tier) => {
                tiersGroup.options.push({
                    name: tier.name,
                    id: tier.id,
                    count: tier.count?.members,
                    class: 'segment-tier'
                });
            });

            options.push(tiersGroup);
            if (this.args.selectDefaultTier && !this.args.tiers) {
                this.setSegment([tiersGroup.options[0]]);
            }
        }

        this._options = options;
    }
}
