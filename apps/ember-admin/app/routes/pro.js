import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ProRoute extends AuthenticatedRoute {
    @service billing;

    queryParams = {
        action: {refreshModel: true}
    };

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // canAccessBilling also admits non-owner users when the site is in a
        // force upgrade state
        if (!this.billing.canAccessBilling) {
            return this.transitionTo('index');
        }

        this.billing.previousTransition = transition;
    }

    model(params) {
        if (params.action) {
            this.billing.action = params.action;
        }

        this.billing.toggleProWindow(true);
    }

    @action
    willTransition(transition) {
        let isBillingTransition = false;

        if (transition) {
            let destinationUrl = (typeof transition.to === 'string')
                ? transition.to
                : (transition.intent
                    ? transition.intent.url
                    : '');

            if (destinationUrl?.includes('/pro')) {
                isBillingTransition = true;
            }
        }

        this.billing.toggleProWindow(isBillingTransition);
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Ghost(Pro)'
        };
    }
}
