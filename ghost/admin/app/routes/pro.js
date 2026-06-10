import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class ProRoute extends AuthenticatedRoute {
    @service billing;
    @service feature;
    @service session;

    @inject config;

    queryParams = {
        action: {refreshModel: true}
    };

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route doesn't run
        // guards or open the billing window in the hidden Ember app. (Query
        // params like ?action=checkout are dropped by the handover; the React
        // screen reads them from the location hash itself.)
        if (this.feature.embedScreensX) {
            const url = transition.intent?.url?.split('?')[0];
            return this.replaceWith('react-fallback', url ? url.replace(/^\//, '') : 'pro');
        }

        // allow non-owner users to access the BMA when we're in a force upgrade state
        if (!this.session.user.isOwnerOnly && !this.config.hostSettings?.forceUpgrade) {
            return this.transitionTo('home');
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
