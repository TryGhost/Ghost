import Component from '@glimmer/component';
import EmberObject, {action} from '@ember/object';
import {A} from '@ember/array';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'name', group: 'Basic'},
    {label: 'Email', name: 'email', group: 'Basic'},
    {label: 'Name or Email', name: 'name_email', group: 'Basic'},
    // {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Newsletter subscription', name: 'subscribed', group: 'Basic'},
    {label: 'Label', name: 'label', group: 'Basic'},

    // Member subscription
    {label: 'Member status', name: 'status', group: 'Subscription'},
    // {label: 'Tier', name: 'tier', group: 'Subscription'},
    {label: 'Billing period', name: 'subscriptions.plan_interval', group: 'Subscription'},

    // Emails
    {label: 'Emails sent (all time)', name: 'email_count', group: 'Email'},
    {label: 'Emails opened (all time)', name: 'email_opened_count', group: 'Email'},
    {label: 'Open rate (all time)', name: 'email_open_rate', group: 'Email'},
    // {label: 'Emails sent (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (30 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails sent (60 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (60 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (60 days)', name: 'x', group: 'Email'},
    {label: 'Stripe subscription status', name: 'subscriptions.status', group: 'Email'}
];

const FILTER_RELATIONS_OPTIONS = {
    name_email: [
        {label: 'contains', name: 'contains'}
    ],
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
        {label: 'is in', name: 'is'},
        {label: 'is not in', name: 'is-not'}
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
            type: 'name',
            relation: 'is',
            value: '',
            relationOptions: FILTER_RELATIONS_OPTIONS.name
        })
    ]);

    get totalFilters() {
        return this.filters.length;
    }

    constructor(...args) {
        super(...args);
        this.availableFilterProperties = FILTER_PROPERTIES;
        this.availableFilterRelationsOptions = FILTER_RELATIONS_OPTIONS;
        this.availableFilterValueOptions = FILTER_VALUE_OPTIONS;
        this.nextFilterId = 1;
    }

    @action
    addFilter() {
        this.filters.pushObject(EmberObject.create({
            id: `filter-${this.nextFilterId}`,
            type: 'name',
            relation: 'is',
            value: '',
            relationOptions: this.availableFilterRelationsOptions.name
        }));
        this.nextFilterId = this.nextFilterId + 1;
    }

    generateNqlFilter(filters) {
        let query = '';
        filters.forEach((filter) => {
            if (filter.value && !['name_email'].includes(filter.type)) {
                if (filter.type === 'label') {
                    const relationStr = filter.relation === 'is-not' ? '-' : '';
                    const filterValue = '[' + filter.value.join(',') + ']';
                    query += `${filter.type}:${relationStr}${filterValue}+`;
                } else {
                    const relationStr = filter.relation === 'is-not' ? '-' : '';
                    const filterValue = filter.value.includes(' ') ? `'${filter.value}'` : filter.value;
                    query += `${filter.type}:${relationStr}${filterValue}+`;
                }
            }
        });
        return query.slice(0, -1);
    }

    @action
    deleteFilter(filterId) {
        const filterToDelete = this.filters.findBy('id', filterId);
        if (this.filters.length === 1) {
            this.resetFilter();
        } else {
            this.filters.removeObject(filterToDelete);
        }
    }

    @action
    setFilterType(filterId, newType) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('type', newType);
        filterToEdit.set('relationOptions', this.availableFilterRelationsOptions[newType]);
        const defaultValue = this.availableFilterValueOptions[newType] ? this.availableFilterValueOptions[newType][0].name : '';
        filterToEdit.set('value', defaultValue);
    }

    @action
    setFilterRelation(filterId, newRelation) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('relation', newRelation);
    }

    @action
    setFilterValue(filterType, filterId, filterValue) {
        const filterToEdit = this.filters.findBy('id', filterId);
        if (filterType === 'label') {
            filterToEdit.set('value', filterValue);
        } else {
            filterToEdit.set('value', filterValue);
        }
    }

    @action
    applyFilter() {
        const query = this.generateNqlFilter(this.filters);
        this.args.onApplyFilter(query, this.filters);
    }

    @action
    resetFilter() {
        this.nextFilterId = 1;
        this.filters = A([
            EmberObject.create({
                id: `filter-0`,
                type: 'name',
                relation: 'is',
                value: '',
                relationOptions: FILTER_RELATIONS_OPTIONS.name
            })
        ]);
        this.args.onResetFilter();
    }
}
