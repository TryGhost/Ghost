import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ProductRoute extends AuthenticatedRoute {
    @service store
    @service router;

    _requiresBackgroundRefresh = true;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    }

    model(params) {
        if (params.product_id) {
            return this.store.queryRecord('product', {id: params.product_id, include: 'stripe_prices'});
        } else {
            return this.store.createRecord('product');
        }
    }

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isOwnerOrAdmin) {
            return this.transitionTo('home');
        }
    }

    setupController(controller, product) {
        super.setupController(...arguments);
        if (this._requiresBackgroundRefresh) {
            if (product.get('id')) {
                return this.store.queryRecord('product', {id: product.get('id'), include: 'stripe_prices'});
            }
        }
    }

    deactivate() {
        super.deactivate(...arguments);
        // clean up newly created records and revert unsaved changes to existing
        this.controller.product.rollbackAttributes();
        this._requiresBackgroundRefresh = true;
    }

    @action
    save() {
        this.controller.save();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Products'
        };
    }

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // product.changedAttributes is always true for new products but number of changed attrs is reliable
            let isChanged = Object.keys(controller.product.changedAttributes()).length > 0;

            if (!controller.product.isDeleted && isChanged) {
                transition.abort();
                controller.toggleUnsavedChangesModal(transition);
                return;
            }
        }
    }
}
