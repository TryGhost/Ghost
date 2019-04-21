const ParentRouter = require('./ParentRouter');
const urlService = require('../url');

const controllers = require('./controllers');
const middlewares = require('./middlewares');

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

        // REGISTER: pagination
        this.router().param('page', middlewares.pageParam);

        // REGISTER: actual rss route
        this.mountRoute(urlService.utils.urlJoin(this.route.value, ':page(\\d+)'), controllers.rss);

        // REGISTER: redirect rule
        this.mountRoute('/feed/', this._redirectFeedRequest.bind(this));
    }

    /**
     * @description Simple controller function to redirect /rss to /feed
     * @param {Object} req
     * @param {Object}res
     * @private
     */
    _redirectFeedRequest(req, res) {
        urlService
            .utils
            .redirect301(
                res,
                urlService.utils.urlJoin(urlService.utils.getSubdir(), req.baseUrl, this.route.value)
            );
    }
}

module.exports = RSSRouter;
