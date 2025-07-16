import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class HomeRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;
    @service router;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // This is needed to initialize the checklist for sites that have been already set up
        if (transition.to?.queryParams?.firstStart === 'true') {
            return this.router.transitionTo('setup.done');
        }
        
        if (this.feature.ui60 || this.feature.trafficAnalytics) {
            this.router.transitionTo('stats-x');
        } else {
            this.router.transitionTo('dashboard');
        }
    }
}
