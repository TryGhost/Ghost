import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default class GhExploreIframe extends Component {
    @service explore;
    @service router;

    async didInsertElement() {
        super.didInsertElement(...arguments);

        this.explore.getExploreIframe().src = this.explore.getIframeURL();

        window.addEventListener('message', async (event) => {
            if (event?.data) {
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
        });
    }

    // The iframe can send route updates to navigate to within Admin, as some routes
    // have to be rendered within the iframe and others require to break out of it.
    _handleRouteUpdate(data) {
        const route = data.route;
        this.explore.isIframeTransition = route?.includes('/explore');
        this.explore.toggleExploreWindow(false);
        this.router.transitionTo(route);
    }

    _handleUrlRequest() {
        this.explore.getExploreIframe().contentWindow.postMessage({
            request: 'apiUrl',
            response: this.explore.apiUrl
        }, '*');

        // NOTE: the handler is placed here to avoid additional logic to check if iframe has loaded
        //       receiving a 'token' request is an indication that page is ready
        // TODO: send flag if dark mode is setup or not
        if (!this.explore.siteData) {
            this.explore.getExploreIframe().contentWindow.postMessage({
                query: 'getSiteData',
                response: 'siteData'
            }, '*');
        }
    }

    _handleSiteDataUpdate(data) {
        this.explore.siteData = data.siteData;
    }
}
