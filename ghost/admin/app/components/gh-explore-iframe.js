import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhExploreIframe extends Component {
    @service explore;
    @service router;
    @service feature;

    constructor() {
        super(...arguments);
        window.addEventListener('message', this.handleIframeMessage);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('message', this.handleIframeMessage);
    }

    @action
    setup() {
        // Only begin setup when Explore window is toggled open
        // to avoid unnecessary loading of assets
        if (this.explore.exploreWindowOpen) {
            this.explore.getExploreIframe().src = this.explore.iframeURL;
        }
    }

    @action
    async handleIframeMessage(event) {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        // only process messages coming from the explore iframe
        if (event?.data && this.explore.iframeURL.includes(event?.origin)) {
            if (event.data?.request === 'apiUrl') {
                this._handleUrlRequest();
            }

            if (event.data?.route) {
                this._handleRouteUpdate(event.data);
            }

            if (event.data?.siteData) {
                this._handleSiteDataUpdate(event.data);
            }
        }
    }

    @action
    async handleDarkModeChange() {
        if (this.explore.exploreWindowOpen) {
            this.explore.sendUIUpdate({darkMode: this.feature.nightShift});
        }
    }

    // The iframe can send route updates to navigate to within Admin, as some routes
    // have to be rendered within the iframe and others require to break out of it.
    _handleRouteUpdate(data) {
        const route = data.route;
        this.explore.isIframeTransition = route?.includes('/explore');
        this.explore.toggleExploreWindow(this.explore.isIframeTransition);
        this.router.transitionTo(route);
    }

    _handleUrlRequest() {
        this.explore.getExploreIframe().contentWindow.postMessage({
            request: 'apiUrl',
            response: {apiUrl: this.explore.apiUrl, darkMode: this.feature.nightShift}
        }, '*');
    }

    _handleSiteDataUpdate(data) {
        this.explore.siteData = data?.siteData ?? {};
    }
}
