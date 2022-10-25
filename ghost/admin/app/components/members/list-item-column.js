import Component from '@glimmer/component';
import {get} from '@ember/object';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

export default class MembersListItemColumn extends Component {
    constructor(...args) {
        super(...args);
    }

    get labels() {
        const labelData = get(this.args.member, 'labels') || [];
        return labelData.map(label => label.name).join(', ');
    }

    get tiers() {
        const tierData = get(this.args.member, 'tiers') || [];
        return tierData.map(tier => tier.name).join(', ');
    }

    get mostRecentSubscription() {
        return mostRecentlyUpdated(get(this.args.member, 'subscriptions'));
    }

    get columnName() {
        return this.args.filterColumn.name;
    }

    get columnValue() {
        return this.args.filterColumn?.getValue ? this.args.filterColumn?.getValue(this.args.member) : null;
    }
}
