import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service feature;
    @service modals;
    @service router;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        const toolbarJSON = new URLSearchParams(window.location.hash.substring(1)).get('__posthog');
        if (toolbarJSON) {
            window.posthog?.loadToolbar(JSON.parse(toolbarJSON));
        }

        if (transition.to?.queryParams?.firstStart === 'true') {
            return this.router.transitionTo('setup.done');
        }

        this.router.transitionTo('dashboard');
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
