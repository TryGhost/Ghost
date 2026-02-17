import Component from '@glimmer/component';
import {action} from '@ember/object';
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

    @action
    toggleSubscriptionExpanded() {
        this.showDetails = !this.showDetails;
    }
}