import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default Route.extend({
    billing: service(),

    queryParams: {
        action: {refreshModel: true}
    },

    model(params) {
        if (params.action) {
            this.billing.set('action', params.action);
        }

        this.billing.set('billingWindowOpen', true);

        // NOTE: if this route is ever triggered it was opened through external link because
        //       the route has no underlying templates to render we redirect to root route
        this.transitionTo('/');
    }
});
