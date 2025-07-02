import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class HomeRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;
    @service router;

    beforeModel() {
        super.beforeModel(...arguments);
        
        if (this.config.labs?.ui60 && this.feature.trafficAnalytics) {
            this.router.transitionTo('stats-x');
        } else {
            this.router.transitionTo('dashboard');
        }
    }
}
