import Route from '@ember/routing/route';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @inject config;
    @service feature;
    @service modals;
    @service router;
    @service session;
    @service settings;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to?.queryParams?.firstStart === 'true') {
            return this.router.transitionTo('setup.done');
        }

        // Redirect to Analytics if trafficAnalytics is enabled and user has access
        if (this.config.stats && this.feature.trafficAnalytics && this.session.user.isAdmin) {
            return this.router.transitionTo('stats-x');
        }

        if (this.settings.socialWebEnabled && this.session.user.isAdmin) {
            this.router.transitionTo('activitypub-x');
        } else {
            if (this.config.labs.updatedMainNav) {
                this.router.transitionTo('stats-x');
            } else {
                this.router.transitionTo('dashboard');
            }
        }
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
