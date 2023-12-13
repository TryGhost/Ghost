import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const FIELD_MAPPINGS = [
    {label: 'Email', value: 'email'},
    {label: 'Name', value: 'name'},
    {label: 'Note', value: 'note'},
    {label: 'Subscribed to emails', value: 'subscribed_to_emails'},
    {label: 'Stripe Customer ID', value: 'stripe_customer_id'},
    {label: 'Complimentary plan', value: 'complimentary_plan'},
    {label: 'Labels', value: 'labels'},
    {label: 'Created at', value: 'created_at'}
];

export default class extends Component {
    @service feature;
    @tracked availableFields = [
        ...FIELD_MAPPINGS,
        ...(
            this.feature.importMemberTier ? [{label: 'Tier', value: 'import_tier'}] : []
        )
    ];

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
