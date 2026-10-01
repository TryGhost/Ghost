import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ProRoute extends AuthenticatedRoute {
    @service billing;
    @service feature;
    @service router;

    queryParams = {
        action: {refreshModel: true}
    };

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // React owns /pro when the flag is on. Strictly boolean: a non-boolean
        // labs value must not hand the route to React.
        if (this.feature.billingReact === true) {
            transition.abort();
            const reactRouteUrl = this._reactRouteUrl(transition);

            // A URL intent already points the browser here, so React renders;
            // a named intent has no URL yet and would otherwise be a no-op.
            if (!transition.intent?.url) {
                this._navigateToReactRoute(reactRouteUrl);
            }

            this._parkOnReactFallback(reactRouteUrl);
            return;
        }

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
            const destinationUrl = (typeof transition.to === 'string')
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

    _reactRouteUrl(transition) {
        const sub = transition.to?.params?.sub?.replace(/\/$/, '');
        return sub ? `/pro/${sub}` : '/pro';
    }

    // See PostsRoute#_parkOnReactFallback: keeps Ember's router state honest
    // after the abort without writing the fallback's URL.
    _parkOnReactFallback(reactRouteUrl) {
        const fallbackPath = reactRouteUrl.replace(/^\//, '');
        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;

        if (parkedPath === fallbackPath) {
            return;
        }

        this.router.replaceWith('react-fallback', fallbackPath).method(null);
    }

    // Seam so tests can assert the navigation without a real hash location
    _navigateToReactRoute(url) {
        window.location.hash = url;
    }
}
