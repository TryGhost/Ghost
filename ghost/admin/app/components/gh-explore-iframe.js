import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default class GhExploreIframe extends Component {
    @service explore;
    @service ghostPaths;
    @service ajax;

    fetchingToken = false;

    didInsertElement() {
        super.didInsertElement(...arguments);

        this.explore.getExploreIframe().src = this.explore.getIframeURL();
        console.log('🤖 → didInsertElement → this.explore.getExploreIframe().src', this.explore.getExploreIframe().src);

        window.addEventListener('message', (event) => {
            console.log('🤖 → window.addEventListener → event', event);
            if (event?.data) {
                if (event.data?.request === 'token') {
                    this._handleTokenRequest();
                }

                if (event.data?.siteData) {
                    this._handleSiteDataUpdate(event.data);
                }
            }
        });
    }

    _handleTokenRequest() {
        this.fetchingToken = false;
        let token;
        console.log('🤖 → _handleTokenRequest → token', token);
        const ghostIdentityUrl = this.ghostPaths.url.api('identities');

        this.ajax.request(ghostIdentityUrl).then((response) => {
            token = response && response.identities && response.identities[0] && response.identities[0].token;
            this.explore.getExploreIframe().contentWindow.postMessage({
                request: 'token',
                response: token
            }, '*');
        }).catch((error) => {
            if (error.payload?.errors && error.payload.errors[0]?.type === 'NoPermissionError') {
                // no permission means the current user requesting the token is not the owner of the site.

                // Avoid letting the BMA waiting for a message and send an empty token response instead
                this.explore.getExploreIframe().contentWindow.postMessage({
                    request: 'token',
                    response: null
                }, '*');
            } else {
                throw error;
            }
        });

        // NOTE: the handler is placed here to avoid additional logic to check if iframe has loaded
        //       receiving a 'token' request is an indication that page is ready
        if (!this.fetchingToken && !this.explore.siteData && token) {
            this.fetchingToken = true;
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
