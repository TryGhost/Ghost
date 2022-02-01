import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service feature;
    @service modals;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (this.feature.improvedOnboarding && transition.to?.queryParams?.firstStart === 'true') {
            this.modals.open('modals/get-started');
        }

        this.transitionTo('dashboard');
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
