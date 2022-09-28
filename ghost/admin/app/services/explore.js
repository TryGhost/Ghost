import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ExploreService extends Service {
    @service router;
    @service feature;

    exploreUrl = 'http://localhost:3000/explore/';
    exploreRouteRoot = '#/explore';

    @tracked exploreWindowOpen = false;
    @tracked siteData = null;
    @tracked previousRoute = null;
    // @tracked action = null;

    get enabled() {
        return this.feature.exploreApp;
    }

    constructor() {
        super(...arguments);

        if (this.exploreUrl) {
            window.addEventListener('message', (event) => {
                if (event && event.data && event.data.route) {
                    this.handleRouteChangeInIframe(event.data.route);
                }
            });
        }
    }

    handleRouteChangeInIframe(destinationRoute) {
        if (this.exploreWindowOpen) {
            let exploreRoute = this.exploreRouteRoot;

            if (destinationRoute !== '/') {
                exploreRoute += destinationRoute;
            }

            if (window.location.hash !== exploreRoute) {
                window.history.replaceState(window.history.state, '', exploreRoute);
            }
        }
    }

    getIframeURL() {
        let url = this.exploreUrl;

        if (window.location.hash && window.location.hash.includes(this.exploreRouteRoot)) {
            let destinationRoute = window.location.hash.replace(this.exploreRouteRoot, '');

            if (destinationRoute) {
                url += destinationRoute;
            }
        }

        return url;
    }

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    // sendRouteUpdate() {
    //     const action = this.action;

    //     if (action) {
    //         if (action === 'checkout') {
    //             this.getExploreIframe().contentWindow.postMessage({
    //                 query: 'routeUpdate',
    //                 response: this.submitRoute
    //             }, '*');
    //         }

    //         this.action = null;
    //     }
    // }

    // Controls explore window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/explore" route in the URL or using history navigation (back and forward)
    toggleExploreWindow(value) {
        if (this.exploreWindowOpen && value) {
            // don't attempt to open again
            return;
        }

        // this.sendRouteUpdate();

        this.exploreWindowOpen = value;
    }

    // Controls navigation to explore window modal which is triggered from the application UI.
    // For example: pressing "View explore" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing explore window
    openExploreWindow(currentRoute, childRoute) {
        if (this.exploreWindowOpen) {
            // don't attempt to open again
            return;
        }

        this.previousRoute = currentRoute;

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleExploreWindow
        window.location.hash = childRoute || '/explore';

        // this.sendRouteUpdate();

        this.router.transitionTo(childRoute || '/explore');
    }

    getExploreIframe() {
        return document.getElementById('explore-frame');
    }
}
