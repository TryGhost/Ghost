import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const FIELD_MAPPINGS = [
    {label: 'email', value: 'email'},
    {label: 'name', value: 'name'},
    {label: 'note', value: 'note'},
    {label: 'subscribed_to_emails', value: 'subscribed_to_emails'},
    {label: 'stripe_customer_id', value: 'stripe_customer_id'},
    {label: 'complimentary_plan', value: 'complimentary_plan'},
    {label: 'labels', value: 'labels'},
    {label: 'created_at', value: 'created_at'}
];

export default class extends Component {
    @tracked availableFields = FIELD_MAPPINGS;

    get mapTo() {
        return this.args.mapTo;
    }

    @action
    updateMapping(newMapTo) {
        if (this.args.updateMapping) {
            this.args.updateMapping(this.args.mapFrom, newMapTo);
        }
    }
}
