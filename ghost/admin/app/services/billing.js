import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default Service.extend({
    router: service(),
    config: service(),
    ghostPaths: service(),

    billingRouteRoot: '#/pro',
    billingWindowOpen: false,
    subscription: null,
    previousRoute: null,

    init() {
        this._super(...arguments);

        if (this.config.get('hostSettings.billing.url')) {
            window.addEventListener('message', (event) => {
                if (event && event.data && event.data.route) {
                    this.handleRouteChangeInIframe(event.data.route);
                }
            });
        }
    },

    handleRouteChangeInIframe(destinationRoute) {
        if (this.get('billingWindowOpen')) {
            let billingRoute = this.get('billingRouteRoot');

            if (destinationRoute !== '/') {
                billingRoute += destinationRoute;
            }

            if (window.location.hash !== billingRoute) {
                window.history.replaceState(window.history.state, '', billingRoute);
            }
        }
    },

    getIframeURL() {
        let url = this.config.get('hostSettings.billing.url');

        if (window.location.hash && window.location.hash.includes(this.get('billingRouteRoot'))) {
            let destinationRoute = window.location.hash.replace(this.get('billingRouteRoot'), '');

            if (destinationRoute) {
                url += destinationRoute;
            }
        }

        return url;
    },

    // Controls billing window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/pro" route in the URL or using history navigation (back and forward)
    toggleProWindow(value) {
        if (this.get('billingWindowOpen') && value) {
            // don't attempt to open again
            return;
        }

        this.set('billingWindowOpen', value);
    },

    // Controls navigation to billing window modal which is triggered from the application UI.
    // For example: pressing "View Billing" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing billing window
    openBillingWindow(currentRoute, childRoute) {
        if (this.get('billingWindowOpen')) {
            // don't attempt to open again
            return;
        }

        this.set('previousRoute', currentRoute);

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleProWindow
        window.location.hash = childRoute || '/pro';

        this.router.transitionTo(childRoute || '/pro');
    },

    getBillingIframe() {
        return document.getElementById('billing-frame');
    }
});
