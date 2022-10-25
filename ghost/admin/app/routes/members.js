import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AdminRoute {
    @service store;
    @service feature;

    fromAnalytics = false;

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
    setupController(controller, model, transition) {
        super.setupController(...arguments);
        controller.fetchLabelsTask.perform();

        if (transition.from?.name === 'posts.analytics') {
            // Sadly transition.from.params is not reliable to use (not populated on transitions)
            const oldParams = transition.router?.oldState?.params['posts.analytics'] ?? {};
            
            // We need to store analytics in 'this' to have it accessible for the member route
            this.fromAnalytics = Object.values(oldParams);
            controller.fromAnalytics = this.fromAnalytics;
        } else if (transition.from?.metadata?.fromAnalytics) {
            // Handle returning from member route
            const fromAnalytics = transition.from?.metadata.fromAnalytics ?? null;
            controller.fromAnalytics = fromAnalytics;
            this.fromAnalytics = fromAnalytics;
        } else {
            controller.fromAnalytics = null;
            this.fromAnalytics = null;
        }
    }

    resetController() {
        super.resetController(...arguments);
        // don't reset fromAnalytics here, we need to reuse it. We reset it in setup
        //controller.fromAnalytics = null;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members',
            mainClasses: ['gh-main-fullwidth'],
            fromAnalytics: this.fromAnalytics
        };
    }
}
