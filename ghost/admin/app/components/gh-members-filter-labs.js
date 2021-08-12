import Component from '@glimmer/component';
import EmberObject, {action} from '@ember/object';
import {A} from '@ember/array';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'name', group: 'Basic'},
    {label: 'Email', name: 'email', group: 'Basic'},
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

const FILTER_RELATIONS = [
    {label: 'is', name: 'is'},
    {label: 'is not', name: 'is-not'},
    {label: 'in', name: 'in'}
    // {label: 'contains', name: 'contains'},
    // {label: 'exists', name: 'exists'},
    // {label: 'does not exist', name: 'does-not-exist'}
];

export default class GhMembersFilterLabsComponent extends Component {
    @service session
    @tracked filters = A([
        EmberObject.create({
            id: `filter-0`,
            type: 'name',
            relation: 'is',
            value: ''
        })
    ]);

    constructor(...args) {
        super(...args);
        this.availableFilterProperties = FILTER_PROPERTIES;
        this.availableFilterRelations = FILTER_RELATIONS;
        this.nextFilterId = 1;
    }

    @action
    addFilter() {
        this.filters.pushObject(EmberObject.create({
            id: `filter-${this.nextFilterId}`,
            type: 'name',
            relation: 'is',
            value: ''
        }));
        this.nextFilterId = this.nextFilterId + 1;
    }

    generateNqlFilter(filters) {
        let query = '';
        filters.forEach((filter) => {
            if (filter.type === 'label') {
                const relationStr = filter.relation === 'is-not' ? '-' : '';
                const filterValue = '[' + filter.value.join(',') + ']';
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else {
                const relationStr = filter.relation === 'is-not' ? '-' : '';
                const filterValue = filter.value.includes(' ') ? `'${filter.value}'` : filter.value;
                query += `${filter.type}:${relationStr}${filterValue}+`;
            }
        });
        return query.slice(0, -1);
    }

    @action
    deleteFilter(filterId) {
        const filterToDelete = this.filters.findBy('id', filterId);
        this.filters.removeObject(filterToDelete);
    }

    @action
    setFilterType(filterId, newType) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('type', newType);
        filterToEdit.set('value', '');
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
}
