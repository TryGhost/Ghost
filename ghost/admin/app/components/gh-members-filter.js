import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'x', group: 'Basic'},
    {label: 'Email', name: 'x', group: 'Basic'},
    {label: 'Location', name: 'x', group: 'Basic'},
    {label: 'Newsletter subscription status', name: 'x', group: 'Basic'},
    {label: 'Label', name: 'x', group: 'Basic'},

    // Member subscription
    {label: 'Member status', name: 'x', group: 'Subscription'},
    {label: 'Tier', name: 'x', group: 'Subscription'},
    {label: 'Billing period', name: 'x', group: 'Subscription'},

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
    {label: 'is', name: 'x'},
    {label: 'is not', name: 'x'},
    {label: 'contains', name: 'x'},
    {label: 'exists', name: 'x'},
    {label: 'does not exist', name: 'x'}
];

export default class GhMembersFilterComponent extends Component {
    @service session

    constructor(...args) {
        super(...args);
        this.availableFilterProperties = FILTER_PROPERTIES;
        this.availableFilterRelations = FILTER_RELATIONS;
    }
}
