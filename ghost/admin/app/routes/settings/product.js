import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class ProductRoute extends AuthenticatedRoute {
    @service store

    model(params) {
        if (params.product_id) {
            return this.store.queryRecord('product', {id: params.product_id, include: 'stripe_prices'});
        } else {
            return this.store.createRecord('product');
        }
    }

    actions = {
        willTransition(transition) {
            return this.controller.leaveRoute(transition);
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Products'
        };
    }
}
