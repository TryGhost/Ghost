import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class ProIndexRoute extends Route {
    @service billing;

    // entering the billing root must sync the iframe just like pro-sub does
    // for child routes — eg. browser Back from /pro/domain, or selecting a
    // billing search result with path '/'; otherwise the iframe keeps showing
    // the previous sub-page under the /pro URL
    beforeModel(transition) {
        if (transition.to?.queryParams?.action) {
            // action-driven opens (eg. ?action=checkout) already navigate the
            // billing app via sendRouteUpdate — don't override the destination
            return;
        }

        this.billing.navigateToSubRoute('/');
    }
}
