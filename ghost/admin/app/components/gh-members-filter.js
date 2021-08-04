import Component from '@glimmer/component';
import {A} from '@ember/array';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'name', group: 'Basic'},
    {label: 'Email', name: 'email', group: 'Basic'},
    {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Newsletter subscription status', name: 'newsletter-subscription-status', group: 'Basic'},
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
    {label: 'Stripe subscription status', name: 'x', group: 'Email'}
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
        {
            id: `filter-0`,
            type: 'email',
            relation: 'is-not',
            value: ''
        }
    ]);

    constructor(...args) {
        super(...args);
        this.availableFilterProperties = FILTER_PROPERTIES;
        this.availableFilterRelations = FILTER_RELATIONS;
    }

    @action
    addFilter() {
        this.filters.pushObject({
            id: `filter-${this.filters.length}`,
            type: 'email',
            relation: 'is-not',
            value: ''
        });
    }

    @action
    deleteFilter(filterId) {
        const filterToDelete = this.filters.findBy('id', filterId);
        this.filters.removeObject(filterToDelete);
    }
}
