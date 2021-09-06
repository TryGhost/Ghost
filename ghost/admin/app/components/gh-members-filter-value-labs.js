import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const FILTER_OPTIONS = {
    subscriptionPriceInterval: [
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
    subscriptionStripeStatus: [
        {label: 'Active', name: 'active'},
        {label: 'Trialing', name: 'trialing'},
        {label: 'Canceled', name: 'canceled'},
        {label: 'Unpaid', name: 'unpaid'},
        {label: 'Past Due', name: 'past_due'},
        {label: 'Incomplete', name: 'incomplete'},
        {label: 'Incomplete - Expired', name: 'incomplete_expired'}
    ]
};

export default class GhMembersFilterValueLabs extends Component {
    @tracked filterValue;
    constructor(...args) {
        super(...args);
        this.availableFilterOptions = FILTER_OPTIONS;
        this.filterValue = this.args.filter.value;
    }

    @action
    setInputFilterValue(filterType, filterId, event) {
        this.filterValue = event.target.value;
    }

    @action
    updateInputFilterValue(filterType, filterId) {
        this.args.setFilterValue(filterType, filterId, this.filterValue);
    }

    @action
    updateInputFilterValueOnEnter(filterType, filterId, event) {
        if (event.keyCode === 13) {
            this.args.setFilterValue(filterType, filterId, this.filterValue);
        }
    }

    @action
    setLabelsFilterValue(filterType, filterId, labels) {
        this.args.setFilterValue(filterType, filterId, labels.map(label => label.slug));
    }

    @action
    setFilterValue(filterType, filterId, value) {
        this.args.setFilterValue(filterType, filterId, value);
    }
}
