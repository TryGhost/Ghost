import MembersManagementRoute from './members-management';
import {didCancel} from 'ember-concurrency';
import {inject as service} from '@ember/service';

export default class MembersRoute extends MembersManagementRoute {
    @service store;
    @service feature;

    queryParams = {
        label: {refreshModel: true},
        searchParam: {refreshModel: true, replace: true},
        paidParam: {refreshModel: true},
        orderParam: {refreshModel: true},
        filterParam: {refreshModel: true},
        postAnalytics: {refreshModel: false}
    };

    model(params) {
        this.controllerFor('members').resetFilters(params);
        return this.controllerFor('members').fetchMembersTask.perform(params);
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);

        try {
            controller.fetchLabelsTask.perform();
        } catch (e) {
            // Do not throw cancellation errors
            if (didCancel(e)) {
                return;
            }

            throw e;
        }
    }

    resetController(controller, _isExiting, transition) {
        super.resetController(...arguments);

        if (controller.postAnalytics) {
            controller.set('postAnalytics', null);
            // Only reset filters if we are not going to member route
            // Otherwise the filters will be gone if we return
            if (!transition?.to?.name?.startsWith('member')) {
                controller.set('filterParam', null);
            }
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
