import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class offersRoute extends AdminRoute {
    @service store;
    @service feature;

    queryParams = {
        type: {refreshModel: true}
    };

    beforeModel() {
        super.beforeModel(...arguments);
        // TODO: redirect if members is disabled?
    }

    model(params) {
        return this.controllerFor('offers').fetchOffersTask.perform(params);
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController() {
        super.setupController(...arguments);
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Offers'
        };
    }
}
