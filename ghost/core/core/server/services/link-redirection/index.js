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

        this.linkRedirectRepository = new LinkRedirectRepository({
            LinkRedirect: models.Redirect,
            urlUtils
        });

        // Expose the service
        this.service = new LinkRedirectsService({
            linkRedirectRepository: this.linkRedirectRepository,
            config: {
                baseURL: new URL(urlUtils.getSiteUrl())
            }
        });
    }
}

module.exports = new LinkRedirectsServiceWrapper();
