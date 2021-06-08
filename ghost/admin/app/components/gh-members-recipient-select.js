import Component from '@glimmer/component';
import flattenGroupedOptions from 'ghost-admin/utils/flatten-grouped-options';
import {Promise} from 'rsvp';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

const BASE_FILTERS = ['status:free', 'status:-free'];

export default class GhMembersRecipientSelect extends Component {
    @service membersUtils;
    @service session;
    @service store;

    baseFilters = new TrackedSet();
    specificFilters = new TrackedSet();

    @tracked isSpecificChecked = false;
    @tracked specificOptions = [];
    @tracked freeMemberCount;
    @tracked paidMemberCount;

    constructor() {
        super(...arguments);

        this.fetchSpecificOptionsTask.perform();
        this.fetchMemberCountsTask.perform();

        this.baseFilters.clear();
        this.specificFilters.clear();

        (this.args.filter || '').split(',').forEach((filter) => {
            if (filter?.trim()) {
                if (BASE_FILTERS.includes(filter)) {
                    this.baseFilters.add(filter);
                } else {
                    this.isSpecificChecked = true;
                    this.specificFilters.add(filter);
                }
            }
        });
    }

    get isPaidAvailable() {
        return this.membersUtils.isStripeEnabled;
    }

    get isFreeChecked() {
        return this.baseFilters.has('status:free');
    }

    get isPaidChecked() {
        return this.baseFilters.has('status:-free');
    }

    get selectedSpecificOptions() {
        return flattenGroupedOptions(this.specificOptions)
            .filter(o => this.specificFilters.has(o.segment));
    }

    get freeMemberCountLabel() {
        if (this.freeMemberCount !== undefined) {
            return `(${this.freeMemberCount})`;
        }
        return '';
    }

    get paidMemberCountLabel() {
        if (this.paidMemberCount !== undefined) {
            return `(${this.paidMemberCount})`;
        }
        return '';
    }

    get filterString() {
        const selectedFilters = !this.isSpecificChecked ?
            new Set([...this.baseFilters.values()]) :
            new Set([...this.baseFilters.values(), ...this.specificFilters.values()]);

        if (!this.isPaidAvailable) {
            selectedFilters.delete('status:-free');
        }

        return Array.from(selectedFilters).join(',') || null;
    }

    @action
    toggleFilter(filter, event) {
        event?.preventDefault();
        if (this.args.disabled) {
            return;
        }
        this.baseFilters.has(filter) ? this.baseFilters.delete(filter) : this.baseFilters.add(filter);
        this.args.onChange?.(this.filterString);
    }

    @action
    toggleSpecificFilter(event) {
        event?.preventDefault();
        if (this.args.disabled) {
            return;
        }
        this.isSpecificChecked = !this.isSpecificChecked;
        this.args.onChange?.(this.filterString);
    }

    @action
    selectSpecificOptions(selectedOptions) {
        if (this.args.disabled) {
            return;
        }
        this.specificFilters.clear();
        selectedOptions.forEach(o => this.specificFilters.add(o.segment));

        if (this.isSpecificChecked) {
            this.args.onChange?.(this.filterString);
        }
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

        this.specificOptions = options;
    }

    @task
    *fetchMemberCountsTask() {
        const user = yield this.session.user;

        if (!user.isOwnerOrAdmin) {
            return;
        }

        yield Promise.all([
            this.store.query('member', {filter: 'subscribed:true+status:free', limit: 1}).then((res) => {
                this.freeMemberCount = res.meta.pagination.total;
            }),
            this.store.query('member', {filter: 'subscribed:true+status:-free', limit: 1}).then((res) => {
                this.paidMemberCount = res.meta.pagination.total;
            })
        ]);
    }
}
