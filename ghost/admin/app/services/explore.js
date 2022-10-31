import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ExploreService extends Service {
    @service router;
    @service feature;
    @service ghostPaths;

    // TODO: make this a config value
    exploreUrl = 'https://ghost.org/explore/';
    exploreRouteRoot = '#/explore';
    submitRoute = 'submit';

    @tracked exploreWindowOpen = false;
    @tracked siteData = null;
    @tracked previousRoute = null;
    @tracked isIframeTransition = false;

    get apiUrl() {
        const origin = new URL(window.location.origin);
        const subdir = this.ghostPaths.subdir;
        // We want the API URL without protocol
        let url = this.ghostPaths.url.join(origin.host, subdir);

        return url.replace(/\/$/, '');
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

            if (destinationRoute.match(/^\/explore(\/.*)?/)) {
                destinationRoute = destinationRoute.replace(/\/explore/, '');
            }

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

            // Connect is an Ember route, do not use it as iframe src
            if (destinationRoute && !destinationRoute.includes('connect')) {
                url += destinationRoute.replace(/^\//, '');
            }
        }

        return url;
    }

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    sendRouteUpdate(route) {
        this.getExploreIframe().contentWindow.postMessage({
            query: 'routeUpdate',
            response: route
        }, '*');
    }

    // Controls explore window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/explore" route in the URL or using history navigation (back and forward)
    toggleExploreWindow(value) {
        if (this.exploreWindowOpen && value) {
            // don't attempt to open again
            return;
        }
        this.exploreWindowOpen = value;
    }

    // Controls navigation to explore window modal which is triggered from the application UI.
    // For example: pressing "View explore" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing the explore window
    openExploreWindow(currentRoute, childRoute) {
        if (this.exploreWindowOpen) {
            // don't attempt to open again
            return;
        }

        this.previousRoute = currentRoute;

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleExploreWindow
        window.location.hash = childRoute || '/explore';

        this.router.transitionTo(childRoute || '/explore');
        this.toggleExploreWindow(true);
    }

    getExploreIframe() {
        return document.getElementById('explore-frame');
    }
}
