import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class HomeRoute extends Route {
    @service feature;
    @service modals;
    @service router;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to?.queryParams?.firstStart === 'true') {
            if (transition.to?.queryParams?.distinctId) {
                const event = new CustomEvent('trackEvent', {detail: {type: 'firstStart', distinctId: transition.to.queryParams.distinctId}});
                window.dispatchEvent(event);
            }
            return this.router.transitionTo('setup.done');
        }

        this.router.transitionTo('dashboard');
    }

    resetController(controller) {
        controller.firstStart = false;
    }
}
