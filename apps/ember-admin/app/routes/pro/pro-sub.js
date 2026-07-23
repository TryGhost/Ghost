import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class ProSubRoute extends Route {
    @service billing;

    // The BMA iframe is preloaded without any sub route, so deep links to
    // /pro/* (eg. from search results) need to tell the loaded app to navigate
    model(params) {
        if (params.sub) {
            this.billing.navigateToSubRoute(`/${params.sub}`);
        }
    }
}
