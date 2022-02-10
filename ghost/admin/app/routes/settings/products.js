import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class ProductsRoute extends AdminRoute {
    @service store;

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Products'
        };
    }

    model() {
        return this.store.findAll('product', {include: 'stripe_prices'});
    }
}
