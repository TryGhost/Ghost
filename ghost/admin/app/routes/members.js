import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AdminRoute {
    @service store;
    @service feature;

    queryParams = {
        label: {refreshModel: true},
        searchParam: {refreshModel: true, replace: true},
        paidParam: {refreshModel: true},
        orderParam: {refreshModel: true},
        filterParam: {refreshModel: true}
    };

    beforeModel() {
        super.beforeModel(...arguments);
        // - TODO: redirect if members is disabled?
    }

    model(params) {
        this.controllerFor('members').resetFilters(params);
        return this.controllerFor('members').fetchMembersTask.perform(params);
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);
        controller.fetchLabelsTask.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members',
            mainClasses: ['gh-main-fullwidth']

        };
    }
}
