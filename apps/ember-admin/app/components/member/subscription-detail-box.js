import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getOfferDisplayData} from 'ghost-admin/utils/subscription-data';
import {tracked} from '@glimmer/tracking';

export default class SubscriptionDetailBox extends Component {
    @tracked showDetails = false;

    get formattedOffers() {
        return (this.args.sub.offer_redemptions ?? []).map(offer => getOfferDisplayData(offer, this.args.sub));
    }

    @action
    toggleSubscriptionExpanded() {
        this.showDetails = !this.showDetails;
    }
}
