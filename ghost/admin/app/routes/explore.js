import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class ExploreRoute extends AdminRoute {
    @service session;
    @service store;
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.feature.explore) {
            return this.transitionTo('home');
        }
    }

    model() {
        return this.store.findAll('integration');
    }
}
