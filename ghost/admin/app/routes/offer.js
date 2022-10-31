import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class OffersRoute extends AdminRoute {
    @service modals;
    @service router;

    _requiresBackgroundRefresh = true;

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.offer_id) {
            return this.store.queryRecord('offer', {id: params.offer_id});
        } else {
            return this.store.createRecord('offer');
        }
    }

    setupController(controller, offer) {
        super.setupController(...arguments);

        if (this._requiresBackgroundRefresh) {
            controller.fetchOfferTask.perform(offer.id);
        }
    }

    deactivate() {
        // clean up newly created records and revert unsaved changes to existing
        this.controller.offer.rollbackAttributes();
        this._requiresBackgroundRefresh = true;
    }

    @action
    async willTransition(transition) {
        if (this.hasConfirmed) {
            return true;
        }

        transition.abort();

        // wait for any existing confirm modal to be closed before allowing transition
        if (this.confirmModal) {
            return;
        }

        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave) {
            this.controller.model.rollbackAttributes();
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.controller.model?.hasDirtyAttributes) {
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }

    @action
    save() {
        this.controller.save();
    }

    titleToken() {
        return this.controller.offer.name;
    }
}
