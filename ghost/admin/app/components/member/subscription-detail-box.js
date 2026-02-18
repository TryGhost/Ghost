import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getOfferDisplayData} from 'ghost-admin/utils/subscription-data';
import {tracked} from '@glimmer/tracking';

export default class SubscriptionDetailBox extends Component {
    @tracked showDetails = false;

    // TODO: remove this fallback once offer_redemptions is available on all environments
    get offerRedemptions() {
        const sub = this.args.sub;
        if (sub.offer_redemptions) {
            return sub.offer_redemptions;
        }
        if (sub.offer) {
            return [sub.offer];
        }
        return [];
    }

    get formattedOffers() {
        return this.offerRedemptions.map(offer => getOfferDisplayData(offer, this.args.sub));
    }

    @action
    toggleSubscriptionExpanded() {
        this.showDetails = !this.showDetails;
    }
}
