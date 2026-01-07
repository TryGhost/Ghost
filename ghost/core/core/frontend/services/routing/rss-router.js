const ParentRouter = require('./parent-router');
const urlUtils = require('../../../shared/url-utils');

const controllers = require('./controllers');

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
        this.mountRoute(this.route.value, controllers.rss);

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
