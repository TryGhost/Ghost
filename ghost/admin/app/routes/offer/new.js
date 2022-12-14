import OfferRoute from '../offer';
import {inject as service} from '@ember/service';

export default class NewOfferRoute extends OfferRoute {
    @service membersUtils;

    controllerName = 'offer';
    templateName = 'offer';

    /**
     * First check if we have active tiers
     */
    beforeModel() {
        if (!this.membersUtils.hasActiveTiers) {
            return this.replaceWith('offers');
        }
    }
}
