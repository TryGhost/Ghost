import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class ProductsRoute extends AuthenticatedRoute {
    @service store

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Products'
        };
    }

    model() {
        return this.store.findAll('product', {include: 'stripe_prices'});
    }
}
