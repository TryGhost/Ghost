import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MentionsRoute extends AuthenticatedRoute {
    @service store;
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.feature.webmentions) {
            return this.transitionTo('dashboard');
        }
    }

    setupController(controller) {
        super.setupController(...arguments);
        controller.loadMentionsTask.perform();
    }
}
