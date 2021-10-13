import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class offersRoute extends AuthenticatedRoute {
    @service store;
    @service feature;

    queryParams = {
        type: {refreshModel: true}
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
