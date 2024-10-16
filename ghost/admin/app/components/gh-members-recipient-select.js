import Component from '@glimmer/component';
import flattenGroupedOptions from 'ghost-admin/utils/flatten-grouped-options';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const BASE_FILTERS = ['status:free', 'status:-free'];

export default class GhMembersRecipientSelect extends Component {
    @service membersUtils;
    @service store;

    @tracked forceSpecificChecked = false;
    @tracked specificOptions = [];

    constructor() {
        super(...arguments);

        this.fetchSpecificOptionsTask.perform();
    }

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? true : this.args.renderInPlace;
    }

    get baseFilters() {
        const filterItems = (this.args.filter || '').split(',');
        const filterItemsArray = filterItems.filter(item => BASE_FILTERS.includes(item?.trim()));
        return new Set(filterItemsArray);
    }

    get isFreeChecked() {
        return this.baseFilters.has('status:free');
    }

    get isPaidChecked() {
        return this.baseFilters.has('status:-free');
    }

    get isPaidAvailable() {
        return this.membersUtils.isStripeEnabled;
    }

    get specificFilters() {
        const filterItems = (this.args.filter || '').split(',');
        const filterItemsArray = filterItems.reject(item => isBlank(item) || BASE_FILTERS.includes(item?.trim()));
        return new Set(filterItemsArray);
    }

    get isSpecificChecked() {
        return this.forceSpecificChecked || this.specificFilters.size > 0;
    }

    get selectedSpecificOptions() {
        return flattenGroupedOptions(this.specificOptions)
            .filter(o => this.specificFilters.has(o.segment));
    }

    @action
    toggleFilter(filter) {
        if (this.args.disabled) {
            return;
        }

        const newBaseFilters = this.baseFilters;
        newBaseFilters.has(filter) ? newBaseFilters.delete(filter) : newBaseFilters.add(filter);

        this.updateFilter({newBaseFilters});
    }

    @action
    toggleSpecificFilter() {
        if (this.args.disabled) {
            return;
        }

        // on->off, forced with an empty filter
        if (this.forceSpecificChecked && this.specificFilters.size === 0) {
            this.forceSpecificChecked = false;
            return;
        }

        this.forceSpecificChecked = false;

        // on->off, store current filter for re-use when toggled back on
        if (this.isSpecificChecked) {
            this._previousSpecificFilters = this.specificFilters;
            this.updateFilter({newSpecificFilters: new Set()});
            return;
        }

        // off->on, re-use stored filter
        if (this._previousSpecificFilters) {
            this.updateFilter({newSpecificFilters: this._previousSpecificFilters});
            return;
        }

        // off->on, display the filter selection even though the actual filter is empty
        this.forceSpecificChecked = true;
    }

    @action
    selectSpecificOptions(selectedOptions) {
        if (this.args.disabled) {
            return;
        }

        const newSpecificFilters = new Set(selectedOptions.map(o => o.segment));

        // If the user has deselected all options, clear the _previousSpecificFilters
        // and force the specific filter to be checked so that the user can still see the options select
        // Refs https://github.com/TryGhost/Team/issues/2859
        if (newSpecificFilters.size === 0) {
            this._previousSpecificFilters = undefined;
            this.forceSpecificChecked = true;
        }

        this.updateFilter({newSpecificFilters});
    }

    updateFilter({newBaseFilters, newSpecificFilters}) {
        const selectedFilters = new Set([
            ...(newBaseFilters || this.baseFilters),
            ...(newSpecificFilters || this.specificFilters)
        ]);

        if (!this.isPaidAvailable) {
            selectedFilters.delete('status:-free');
        }

        const newFilter = Array.from(selectedFilters).join(',') || null;

        this.args.onChange?.(newFilter);
    }

    @task
    *fetchSpecificOptionsTask() {
        const options = [];

        // fetch all labels w̶i̶t̶h̶ c̶o̶u̶n̶t̶s̶
        // TODO: add `include: 'count.members` to query once API is fixed
        const labels = yield this.store.query('label', {limit: 'all'});

        if (labels.length > 0) {
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
        // fetch all tiers w̶i̶t̶h̶ c̶o̶u̶n̶t̶s̶
        // TODO: add `include: 'count.members` to query once API supports
        const tiers = yield this.store.query('tier', {filter: 'type:paid', limit: 'all'});

        if (tiers.length > 1) {
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
                    segment: `tier:${tier.slug}`,
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
        }

        this.specificOptions = options;
    }
}
