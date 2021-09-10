import Component from '@glimmer/component';
import EmberObject, {action} from '@ember/object';
import nql from '@nexes/nql-lang';
import {A} from '@ember/array';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
const FILTER_PROPERTIES = [
    // Basic
    // {label: 'Name', name: 'name', group: 'Basic'},
    // {label: 'Email', name: 'email', group: 'Basic'},
    // {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Label', name: 'label', group: 'Basic'},
    {label: 'Newsletter subscription', name: 'subscribed', group: 'Basic'},

    // Member subscription
    {label: 'Member status', name: 'status', group: 'Subscription'},
    // {label: 'Tier', name: 'tier', group: 'Subscription'},
    {label: 'Billing period', name: 'subscriptions.plan_interval', group: 'Subscription'},
    {label: 'Stripe subscription status', name: 'subscriptions.status', group: 'Subscription'},

    // Emails
    {label: 'Emails sent (all time)', name: 'email_count', group: 'Email'},
    {label: 'Emails opened (all time)', name: 'email_opened_count', group: 'Email'},
    {label: 'Open rate (all time)', name: 'email_open_rate', group: 'Email'}
    // {label: 'Emails sent (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (30 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails sent (60 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (60 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (60 days)', name: 'x', group: 'Email'},
];

const FILTER_RELATIONS_OPTIONS = {
    subscribed: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    name: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    email: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    status: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    'subscriptions.plan_interval': [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    'subscriptions.status': [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    label: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    email_count: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ],
    email_opened_count: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ],
    email_open_rate: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ]
};

const FILTER_VALUE_OPTIONS = {
    'subscriptions.plan_interval': [
        {label: 'Monthly', name: 'month'},
        {label: 'Yearly', name: 'year'}
    ],
    status: [
        {label: 'Paid', name: 'paid'},
        {label: 'Free', name: 'free'},
        {label: 'Complimentary', name: 'comped'}
    ],
    subscribed: [
        {label: 'Subscribed', name: 'true'},
        {label: 'Unsubscribed', name: 'false'}
    ],
    'subscriptions.status': [
        {label: 'Active', name: 'active'},
        {label: 'Trialing', name: 'trialing'},
        {label: 'Canceled', name: 'canceled'},
        {label: 'Unpaid', name: 'unpaid'},
        {label: 'Past Due', name: 'past_due'},
        {label: 'Incomplete', name: 'incomplete'},
        {label: 'Incomplete - Expired', name: 'incomplete_expired'}
    ]
};
export default class GhMembersFilterLabsComponent extends Component {
    @service session
    @tracked filters = A([
        EmberObject.create({
            id: `filter-0`,
            type: 'label',
            relation: 'is',
            value: [],
            relationOptions: FILTER_RELATIONS_OPTIONS.label
        })
    ]);

    get totalFilters() {
        return this.filters?.length;
    }

    constructor(...args) {
        super(...args);
        this.availableFilterProperties = FILTER_PROPERTIES;
        this.availableFilterRelationsOptions = FILTER_RELATIONS_OPTIONS;
        this.availableFilterValueOptions = FILTER_VALUE_OPTIONS;
        this.nextFilterId = 1;
        if (this.args.defaultFilterParam) {
            this.parseNqlFilter(this.args.defaultFilterParam);
        }
    }

    @action
    addFilter() {
        this.filters.pushObject(EmberObject.create({
            id: `filter-${this.nextFilterId}`,
            type: 'label',
            relation: 'is',
            value: [],
            relationOptions: FILTER_RELATIONS_OPTIONS.label
        }));
        this.nextFilterId = this.nextFilterId + 1;
        this.applySoftFilter();
    }

    @action
    onDropdownClose() {
        this.applyFilter();
    }

    generateNqlFilter(filters) {
        let query = '';
        filters.forEach((filter) => {
            if (filter.type === 'label' && filter.value?.length) {
                const relationStr = filter.relation === 'is-not' ? '-' : '';
                const filterValue = '[' + filter.value.join(',') + ']';
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else {
                const relationStr = this.getFilterRelationOperator(filter.relation);
                const filterValue = (typeof filter.value === 'string' && filter.value.includes(' ')) ? `'${filter.value}'` : filter.value;
                query += `${filter.type}:${relationStr}${filterValue}+`;
            }
        });
        return query.slice(0, -1);
    }

    parseNqlFilterKey(nqlFilter) {
        const keys = Object.keys(nqlFilter);
        const key = keys[0];
        const value = nqlFilter[key];
        const filterId = this.nextFilterId;
        if (typeof value === 'object') {
            if (value.$in !== undefined && key === 'label') {
                this.nextFilterId = this.nextFilterId + 1;
                return EmberObject.create({
                    id: `filter-${filterId}`,
                    type: key,
                    relation: 'is',
                    value: value.$in,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key]
                });
            }
            if (value.$nin !== undefined && key === 'label') {
                this.nextFilterId = this.nextFilterId + 1;
                return EmberObject.create({
                    id: `filter-${filterId}`,
                    type: key,
                    relation: 'is-not',
                    value: value.$nin,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key]
                });
            }
            if (value.$ne !== undefined) {
                this.nextFilterId = this.nextFilterId + 1;
                return EmberObject.create({
                    id: `filter-${filterId}`,
                    type: key,
                    relation: 'is-not',
                    value: value.$ne,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key]
                });
            }
            if (value.$gt !== undefined) {
                this.nextFilterId = this.nextFilterId + 1;
                return EmberObject.create({
                    id: `filter-${filterId}`,
                    type: key,
                    relation: 'is-greater',
                    value: value.$gt ,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key]
                });
            }

            if (value.$lt !== undefined) {
                this.nextFilterId = this.nextFilterId + 1;
                return EmberObject.create({
                    id: `filter-${filterId}`,
                    type: key,
                    relation: 'is-less',
                    value: value.$lt,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key]
                });
            }
            return null;
        } else {
            this.nextFilterId = this.nextFilterId + 1;
            return EmberObject.create({
                id: `filter-${filterId}`,
                type: key,
                relation: 'is',
                value: value,
                relationOptions: FILTER_RELATIONS_OPTIONS[key]
            });
        }
    }

    parseNqlFilter(filterParam) {
        const validKeys = Object.keys(FILTER_RELATIONS_OPTIONS);
        const filters = nql.parse(filterParam);
        const filterKeys = Object.keys(filters);
        let filterData = [];
        if (filterKeys?.length === 1 && validKeys.includes(filterKeys[0])) {
            const filterObj = this.parseNqlFilterKey(filters);
            filterData = [filterObj];
        } else if (filters?.$and) {
            const andFilters = filters?.$and || [];
            filterData = andFilters.filter((nqlFilter) => {
                const _filterKeys = Object.keys(nqlFilter);
                if (_filterKeys?.length === 1 && validKeys.includes(_filterKeys[0])) {
                    return true;
                }
                return false;
            }).map((nqlFilter) => {
                return this.parseNqlFilterKey(nqlFilter);
            }).filter((nqlFilter) => {
                return !!nqlFilter;
            });
        }

        this.filters = A(filterData);
    }

    getFilterRelationOperator(relation) {
        if (relation === 'is-not') {
            return '-';
        } else if (relation === 'is-greater') {
            return '>';
        } else if (relation === 'is-less') {
            return '<';
        }
        return '';
    }

    @action
    deleteFilter(filterId, event) {
        event.stopPropagation();
        event.preventDefault();

        const filterToDelete = this.filters.findBy('id', filterId);
        if (this.filters.length === 1) {
            this.resetFilter();
        } else {
            this.filters.removeObject(filterToDelete);
            this.applySoftFilter();
        }
    }

    @action
    setFilterType(filterId, newType) {
        let defaultValue = this.availableFilterValueOptions[newType] ? this.availableFilterValueOptions[newType][0].name : '';
        if (newType === 'label' && !defaultValue) {
            defaultValue = [];
        }
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit?.setProperties({
            type: newType,
            relationOptions: this.availableFilterRelationsOptions[newType],
            value: defaultValue
        });
        if (newType !== 'label' && defaultValue) {
            this.applySoftFilter();
        }
    }

    @action
    setFilterRelation(filterId, newRelation) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('relation', newRelation);
        this.applySoftFilter();
    }

    @action
    setFilterValue(filterType, filterId, filterValue) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('value', filterValue);
        this.applySoftFilter();
    }

    @action
    applySoftFilter() {
        const validFilters = this.filters.filter((fil) => {
            if (fil.type === 'label') {
                return fil.value?.length;
            }
            return fil.value;
        });
        const query = this.generateNqlFilter(validFilters);
        this.args.onApplySoftFilter(query, validFilters);
    }

    @action
    applyFilter() {
        const validFilters = this.filters.filter((fil) => {
            if (fil.type === 'label') {
                return fil.value?.length;
            }
            return fil.value;
        });

        const query = this.generateNqlFilter(validFilters);
        this.args.onApplyFilter(query, validFilters);
    }

    @action
    resetFilter() {
        this.nextFilterId = 1;
        this.filters = A([
            EmberObject.create({
                id: `filter-0`,
                type: 'label',
                relation: 'is',
                value: [],
                relationOptions: FILTER_RELATIONS_OPTIONS.label
            })
        ]);
        this.args.onResetFilter();
    }
}
