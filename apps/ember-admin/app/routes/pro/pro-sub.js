import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class ProSubRoute extends Route {
    @service billing;

    // the billing app can't follow Ember transitions on its own — forward
    // /pro/* deep links to it (see billing.navigateToSubRoute). This route
    // has no model; it exists to relay the requested sub-route, so the
    // side effect lives in beforeModel
    beforeModel(transition) {
        const sub = transition.to?.params?.sub;

        if (sub) {
            this.billing.navigateToSubRoute(`/${sub}`);
        }
    }
}
