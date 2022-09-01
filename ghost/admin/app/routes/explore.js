import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class ExploreRoute extends AdminRoute {
    @service store;

    model() {
        return this.store.findAll('integration');
    }
}
