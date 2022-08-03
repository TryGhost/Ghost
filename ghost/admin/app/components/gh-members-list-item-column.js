import Component from '@glimmer/component';
import {get} from '@ember/object';
import {mostRecentlyUpdated} from 'ghost-admin/helpers/most-recently-updated';

export default class GhMembersListItemColumn extends Component {
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
}
