import MissingTiersModal from '../../components/modals/offers/missing-tiers';
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
            // Not allowed: we reached the limit here
            this.modals.open(MissingTiersModal, {
                message: ''
            });
            return this.replaceWith('offers');
        }
    }
}
