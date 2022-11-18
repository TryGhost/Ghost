import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

export default class BillingService extends Service {
    @service ghostPaths;
    @service router;
    @service store;

    @inject config;

    billingRouteRoot = '#/pro';

    @tracked billingWindowOpen = false;
    @tracked subscription = null;
    @tracked previousRoute = null;
    @tracked action = null;
    @tracked ownerUser = null;

    constructor() {
        super(...arguments);

        if (this.config.hostSettings?.billing?.url) {
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

        let url = this.config.hostSettings?.billing?.url;

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
            this.ownerUser = user;
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

            this.action = null;
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

        this.billingWindowOpen = value;
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

        this.previousRoute = currentRoute;

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
