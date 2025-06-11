import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service feature;
    @service modals;
    @service router;
    @service session;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to?.queryParams?.firstStart === 'true') {
            return this.router.transitionTo('setup.done');
        }

        if (this.feature.ActivityPub && this.session.user.isAdmin) {
            this.router.transitionTo('activitypub-x');
        } else {
            this.router.transitionTo('dashboard');
        }
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
