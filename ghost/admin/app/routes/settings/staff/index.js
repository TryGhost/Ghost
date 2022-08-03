import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class IndexRoute extends AuthenticatedRoute {
    @service infinity;
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (user.isAuthorOrContributor) {
            return this.transitionTo('settings.staff.user', user);
        }
    }

    model() {
        return this.session.user;
    }

    setupController(controller) {
        super.setupController(...arguments);
        controller.backgroundUpdate.perform();
    }

    @action
    reload() {
        this.controller.backgroundUpdate.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Staff'
        };
    }
}
