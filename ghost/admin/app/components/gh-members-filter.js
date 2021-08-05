import Component from '@glimmer/component';
import EmberObject, {action} from '@ember/object';
import {A} from '@ember/array';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'name', group: 'Basic'},
    {label: 'Email', name: 'email', group: 'Basic'},
    {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Newsletter subscription status', name: 'subscribed', group: 'Basic'},
    {label: 'Label', name: 'label', group: 'Basic'},

    // Member subscription
    {label: 'Member status', name: 'member-status', group: 'Subscription'},
    {label: 'Tier', name: 'tier', group: 'Subscription'},
    {label: 'Billing period', name: 'billing-period', group: 'Subscription'},

    // Emails
    {label: 'Emails sent (all time)', name: 'x', group: 'Email'},
    {label: 'Emails opened (all time)', name: 'x', group: 'Email'},
    {label: 'Open rate (all time)', name: 'x', group: 'Email'},
    {label: 'Emails sent (30 days)', name: 'x', group: 'Email'},
    {label: 'Emails opened (30 days)', name: 'x', group: 'Email'},
    {label: 'Open rate (30 days)', name: 'x', group: 'Email'},
    {label: 'Emails sent (60 days)', name: 'x', group: 'Email'},
    {label: 'Emails opened (60 days)', name: 'x', group: 'Email'},
    {label: 'Open rate (60 days)', name: 'x', group: 'Email'},
    {label: 'Stripe subscription status', name: 'status', group: 'Email'}
];

const FILTER_RELATIONS = [
    {label: 'is', name: 'is'},
    {label: 'is not', name: 'is-not'},
    {label: 'contains', name: 'contains'},
    {label: 'exists', name: 'exists'},
    {label: 'does not exist', name: 'does-not-exist'}
];

export default class GhMembersFilterComponent extends Component {
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
            const relationStr = filter.relation === 'is-not' ? '-' : '';
            query += `${filter.type}:${relationStr}'${filter.value}',`;
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
    }

    @action
    setFilterRelation(filterId, newRelation) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('relation', newRelation);
    }

    @action
    setFilterValue(filterId, event) {
        const filterToEdit = this.filters.findBy('id', filterId);
        filterToEdit.set('value', event.target.value);
    }

    @action
    applyFilter() {
        const query = this.generateNqlFilter(this.filters);
        this.args.onApplyFilter(query);
    }
}
