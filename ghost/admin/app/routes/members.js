import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AuthenticatedRoute {
    @service store;

    queryParams = {
        label: {refreshModel: true},
        searchParam: {refreshModel: true, replace: true},
        paidParam: {refreshModel: true},
        orderParam: {refreshModel: true},
        filterParam: {refreshModel: true}
    };

    // redirect to posts screen if:
    // - TODO: members is disabled?
    // - logged in user isn't owner/admin
    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        return this.controllerFor('members').fetchMembersTask.perform(params);
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);
        controller.fetchLabelsTask.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members'
        };
    }
}
