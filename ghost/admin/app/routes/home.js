import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service feature;
    @service modals;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (this.feature.improvedOnboarding && transition.to?.queryParams?.firstStart === 'true') {
            return this.transitionTo('setup.done');
        }

        this.transitionTo('dashboard');
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
