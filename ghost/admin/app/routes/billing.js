import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default Route.extend({
    billing: service(),

    queryParams: {
        action: {refreshModel: true}
    },

    beforeModel(transition) {
        this.billing.set('previousTransition', transition);
    },

    model(params) {
        if (params.action) {
            this.billing.set('action', params.action);
        }

        this.billing.setBillingWindowOpen(true);
    },

    actions: {
        willTransition(transition) {
            let isBillingTransition = false;

            if (transition) {
                let destinationUrl = (typeof transition.to === 'string')
                    ? transition.to
                    : (transition.intent
                        ? transition.intent.url
                        : '');

                if (destinationUrl?.includes('/billing')) {
                    isBillingTransition = true;
                }
            }

            this.billing.setBillingWindowOpen(isBillingTransition);
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Billing'
        };
    }
});
