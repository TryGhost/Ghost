import Component from '@ember/component';
import {inject as service} from '@ember/service';

export default class GhExploreIframe extends Component {
    @service explore;

    async didInsertElement() {
        super.didInsertElement(...arguments);

        this.explore.getExploreIframe().src = this.explore.getIframeURL();

        window.addEventListener('message', async (event) => {
            if (event?.data) {
                if (event.data?.request === 'apiUrl') {
                    this._handleUrlRequest();
                }

                if (event.data?.siteData) {
                    this._handleSiteDataUpdate(event.data);
                }
            }
        });
    }

    _handleUrlRequest() {
        this.explore.getExploreIframe().contentWindow.postMessage({
            request: 'apiUrl',
            response: this.explore.apiUrl
        }, '*');

        // NOTE: the handler is placed here to avoid additional logic to check if iframe has loaded
        //       receiving a 'token' request is an indication that page is ready
        if (!this.explore.siteData) {
            this.explore.getExploreIframe().contentWindow.postMessage({
                query: 'getSiteData',
                response: 'siteData'
            }, '*');
        }
    }

    _handleSiteDataUpdate(data) {
        // TODO: now we received the site data, we can show the fireworks and the actual data
        this.explore.siteData = data.siteData;
    }
}
