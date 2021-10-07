import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class SettingsOffersLinkRoute extends AuthenticatedRoute {
    @service modals;

    activate() {
        this.advancedModal = this.modals.open('modals/offers/link', {}, {
            className: 'fullscreen-modal-action fullscreen-modal-wide',
            beforeClose: bind(this, this.beforeModalClose)
        });
    }

    @action
    willTransition() {
        this.isTransitioning = true;
        return true;
    }

    deactivate() {
        this.advancedModal?.close();
        this.advancedModal = null;
        this.isTransitioning = false;
    }

    beforeModalClose() {
        if (this.isTransitioning) {
            return;
        }

        this.transitionTo('offers');
    }
}
