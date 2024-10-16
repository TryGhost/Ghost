import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

export default class ExploreService extends Service {
    @service router;
    @service feature;
    @service ghostPaths;

    @inject config;

    exploreUrl = 'https://ghost.org/explore/';
    exploreRouteRoot = '#/explore';
    submitRoute = 'submit';

    @tracked exploreWindowOpen = false;
    @tracked siteData = null;
    @tracked isIframeTransition = false;

    get apiUrl() {
        const origin = new URL(window.location.origin);
        const subdir = this.ghostPaths.subdir;
        // We want the API URL without protocol
        let url = this.ghostPaths.url.join(origin.host, subdir);

        return url.replace(/\/$/, '');
    }

    get iframeURL() {
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

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    sendRouteUpdate(route) {
        this.getExploreIframe().contentWindow.postMessage({
            query: 'routeUpdate',
            response: route
        }, '*');
    }

    sendUIUpdate(data) {
        this.getExploreIframe().contentWindow.postMessage({
            query: 'uiUpdate',
            response: data
        }, '*');
    }

    // Controls explore window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/explore" route in the URL or using history navigation (back and forward)
    toggleExploreWindow(value) {
        if (this.config.hostSettings?.forceUpgrade && value) {
            // don't attempt to open Explore iframe when in Force Upgrade state
            return;
        }

        if (this.exploreWindowOpen && value) {
            // don't attempt to open again
            return;
        }
        this.exploreWindowOpen = value;
    }

    openExploreWindow() {
        if (this.config.hostSettings?.forceUpgrade) {
            // don't attempt to open Explore iframe when in Force Upgrade state
            return;
        }
        if (this.exploreWindowOpen) {
            // don't attempt to open again
            return;
        }

        // Begin loading the iframe and setting the src if it's not already set
        this.ensureIframeIsLoaded();

        // Ensures correct iframe URL calculation when syncing iframe location
        // in toggleExploreWindow
        window.location.hash = '/explore';

        this.router.transitionTo('/explore');
        this.toggleExploreWindow(true);
    }

    ensureIframeIsLoaded() {
        if (this.getExploreIframe() && !this.getExploreIframe()?.src) {
            this.getExploreIframe().src = this.iframeURL;
        }
    }

    getExploreIframe() {
        return document.getElementById('explore-frame');
    }
}
