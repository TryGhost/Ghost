const urlUtils = require('../../../shared/url-utils');
const LinkRedirectRepository = require('./LinkRedirectRepository');
const adapterManager = require('../adapter-manager');
const config = require('../../../shared/config');
const EventRegistry = require('../../lib/common/events');

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
            urlUtils,
            cacheAdapter: config.get('hostSettings:linkRedirectsPublicCache:enabled') ? adapterManager.getAdapter('cache:linkRedirectsPublic') : null,
            EventRegistry
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
