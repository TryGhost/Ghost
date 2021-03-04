import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default Service.extend({
    router: service(),
    config: service(),
    ghostPaths: service(),

    billingRouteRoot: '#/billing',
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
    // for example: by entering "/billing" route in the URL or using history navigation (back and forward)
    setBillingWindowOpen(value) {
        let billingIframe = this.getBillingIframe();

        if (billingIframe && value) {
            billingIframe.contentWindow.location.replace(this.getIframeURL());
        }

        this.set('billingWindowOpen', value);
    },

    // Controls navigation to billing window modal which is triggered from the application UI.
    // For example: pressing "View Billing" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing billing window
    openBillingWindow(currentRoute, childRoute) {
        this.set('previousRoute', currentRoute);

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in setBillingWindowOpen
        window.location.hash = childRoute || '/billing';

        this.router.transitionTo(childRoute || '/billing');
    },

    closeBillingWindow() {
        this.set('billingWindowOpen', false);

        let transitionRoute = this.get('previousRoute') || '/';
        this.router.transitionTo(transitionRoute);
    },

    getBillingIframe() {
        return document.getElementById('billing-frame');
    }
});
