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
        // When membersForward is enabled, delegate to React - don't load Ember data
        if (this.feature.membersForward) {
            return null;
        }

        this.controllerFor('members').resetFilters(params);
        return this.controllerFor('members').fetchMembersTask.perform(params);
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);

        // When membersForward is enabled, skip Ember data loading
        if (this.feature.membersForward) {
            return;
        }

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

        // When membersForward is enabled, skip Ember controller reset logic
        if (this.feature.membersForward) {
            return;
        }

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
            mainClasses: this.feature.membersForward ? [] : ['gh-main-fullwidth']
        };
    }
}
