import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';

@classic
export default class BillingService extends Service {
    @service router;
    @service config;

    @service ghostPaths;
    @service store;

    billingRouteRoot = '#/pro';
    billingWindowOpen = false;
    subscription = null;
    previousRoute = null;
    action = null;
    ownerUser = null;

    init() {
        super.init(...arguments);

        if (this.config.get('hostSettings.billing.url')) {
            window.addEventListener('message', (event) => {
                if (event && event.data && event.data.route) {
                    this.handleRouteChangeInIframe(event.data.route);
                }
            });
        }
    }

    handleRouteChangeInIframe(destinationRoute) {
        if (this.billingWindowOpen) {
            let billingRoute = this.billingRouteRoot;

            if (destinationRoute !== '/') {
                billingRoute += destinationRoute;
            }

            if (window.location.hash !== billingRoute) {
                window.history.replaceState(window.history.state, '', billingRoute);
            }
        }
    }

    getIframeURL() {
        // initiate getting owner user in the background
        this.getOwnerUser();

        let url = this.config.get('hostSettings.billing.url');

        if (window.location.hash && window.location.hash.includes(this.billingRouteRoot)) {
            let destinationRoute = window.location.hash.replace(this.billingRouteRoot, '');

            if (destinationRoute) {
                url += destinationRoute;
            }
        }

        return url;
    }

    async getOwnerUser() {
        if (!this.ownerUser) {
            // Try to receive the owner user from the store
            let user = this.store.peekAll('user').findBy('isOwnerOnly', true);

            if (!user) {
                // load it when it's not there yet
                await this.store.findAll('user', {reload: true});
                user = this.store.peekAll('user').findBy('isOwnerOnly', true);
            }
            this.set('ownerUser', user);
        }
        return this.ownerUser;
    }

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    sendRouteUpdate() {
        const action = this.action;

        if (action) {
            if (action === 'checkout') {
                this.getBillingIframe().contentWindow.postMessage({
                    query: 'routeUpdate',
                    response: this.checkoutRoute
                }, '*');
            }

            this.set('action', null);
        }
    }

    // Controls billing window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/pro" route in the URL or using history navigation (back and forward)
    toggleProWindow(value) {
        if (this.billingWindowOpen && value && !this.action) {
            // don't attempt to open again
            return;
        }

        this.sendRouteUpdate();

        this.set('billingWindowOpen', value);
    }

    // Controls navigation to billing window modal which is triggered from the application UI.
    // For example: pressing "View Billing" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing billing window
    openBillingWindow(currentRoute, childRoute) {
        // initiate getting owner user in the background
        this.getOwnerUser();

        if (this.billingWindowOpen) {
            // don't attempt to open again
            return;
        }

        this.set('previousRoute', currentRoute);

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleProWindow
        window.location.hash = childRoute || '/pro';

        this.sendRouteUpdate();

        this.router.transitionTo(childRoute || '/pro');
    }

    getBillingIframe() {
        return document.getElementById('billing-frame');
    }
}
