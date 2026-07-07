const LinkRedirectRepository = require('./link-redirect-repository');
const LinkRedirectsService = require('./link-redirects-service');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.urlUtils
 * @param {object} deps.events
 * @param {object} [deps.cacheAdapter]
 */
module.exports = function createLinkRedirectsService({models, urlUtils, events, cacheAdapter = null}) {
    const linkRedirectRepository = new LinkRedirectRepository({
        LinkRedirect: models.Redirect,
        urlUtils,
        cacheAdapter,
        EventRegistry: events
    });

    const service = new LinkRedirectsService({
        linkRedirectRepository,
        config: {
            baseURL: new URL(urlUtils.getSiteUrl())
        }
    });

    return {
        service,
        linkRedirectRepository,
        init() {}
    };
};
