const urlUtils = require('../../../shared/url-utils');

class LinkRedirectsServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {LinkRedirectsService} = require('@tryghost/link-redirects');

        const store = [];
        // Expose the service
        this.service = new LinkRedirectsService({
            linkRedirectRepository: {
                async save(linkRedirect) {
                    store.push(linkRedirect);
                },
                async getByURL(url) {
                    return store.find((link) => {
                        return link.from.pathname === url.pathname;
                    });
                }
            },
            config: {
                baseURL: new URL(urlUtils.getSiteUrl())
            }
        });
    }
}

module.exports = new LinkRedirectsServiceWrapper();
