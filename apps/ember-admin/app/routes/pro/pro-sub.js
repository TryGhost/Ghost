import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class ProSubRoute extends Route {
    @service billing;

    // the billing app can't follow Ember transitions on its own — forward
    // /pro/* deep links to it (see billing.navigateToSubRoute)
    beforeModel(transition) {
        const sub = transition.to?.params?.sub?.replace(/\/$/, '');

        if (sub) {
            this.billing.navigateToSubRoute(`/${sub}`);
        }
    }
}
