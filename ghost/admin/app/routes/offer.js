import AdminRoute from 'ghost-admin/routes/admin';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class OffersRoute extends AdminRoute {
    @service router;

    _requiresBackgroundRefresh = true;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    }

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
            // `offer` is passed directly in `<LinkTo>` so it can be a proxy
            // object used by the sparse list requiring the use of .get()
            controller.fetchOfferTask.perform(offer.get('id'));
        }
    }

    deactivate() {
        super.deactivate(...arguments);
        // clean up newly created records and revert unsaved changes to existing
        this.controller.offer.rollbackAttributes();
        this._requiresBackgroundRefresh = true;
    }

    @action
    save() {
        this.controller.save();
    }

    titleToken() {
        return this.controller.offer.name;
    }

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // offer.changedAttributes is always true for new offers but number of changed attrs is reliable
            let isChanged = Object.keys(controller.offer.changedAttributes()).length > 0;

            if (!controller.offer.isDeleted && isChanged) {
                transition.abort();
                controller.toggleUnsavedChangesModal(transition);
                return;
            }
        }
    }
}
