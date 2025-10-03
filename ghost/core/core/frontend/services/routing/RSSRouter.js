const ParentRouter = require('./ParentRouter');
const urlUtils = require('../../../shared/url-utils');

const controllers = require('./controllers');
const rssAuthMiddleware = require('../../../server/services/members/rss-auth-middleware');

/**
 * @description RSS Router, which should be used as a sub-router in other routes.
 *
 * "/rss" -> RSS Router
 */
class RSSRouter extends ParentRouter {
    constructor() {
        super('RSSRouter');

        this.route = {value: '/rss/'};
        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // Add RSS authentication middleware before the controller
        // We need to use the router directly to chain middleware
        this._router.get(this.route.value, rssAuthMiddleware.authenticateRssFeed, controllers.rss);
        this._router.post(this.route.value, rssAuthMiddleware.authenticateRssFeed, controllers.rss);

        // REGISTER: redirect rule
        this.mountRoute('/feed/', this._redirectFeedRequest.bind(this));
    }

    /**
     * @description Simple controller function to redirect /feed to /rss
     * @param {Object} req
     * @param {Object}res
     * @private
     */
    _redirectFeedRequest(req, res) {
        urlUtils
            .redirect301(
                res,
                urlUtils.urlJoin(urlUtils.getSubdir(), req.baseUrl, this.route.value)
            );
    }
}

module.exports = RSSRouter;
