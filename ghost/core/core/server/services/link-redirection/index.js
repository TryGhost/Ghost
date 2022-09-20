const urlUtils = require('../../../shared/url-utils');
const LinkRedirectRepository = require('./LinkRedirectRepository');

class LinkRedirectsServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');

        const {LinkRedirectsService} = require('@tryghost/link-redirects');

        const linkRedirectRepository = new LinkRedirectRepository({
            LinkRedirect: models.LinkRedirect
        });

        // Expose the service
        this.service = new LinkRedirectsService({
            linkRedirectRepository,
            config: {
                baseURL: new URL(urlUtils.getSiteUrl())
            }
        });
    }
}

module.exports = new LinkRedirectsServiceWrapper();
