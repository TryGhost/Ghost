const ParentRouter = require('./ParentRouter');
const urlUtils = require('../../../shared/url-utils');

const controllers = require('./controllers');
const rssMemberAuth = require('./middleware/rss-member-auth');

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
        // Add member auth middleware to all RSS routes
        this.router().use(rssMemberAuth);

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
        let redirectUrl = urlUtils.urlJoin(urlUtils.getSubdir(), req.baseUrl, this.route.value);

        // Preserve query parameters (including member auth params)
        if (req.url.includes('?')) {
            const queryString = req.url.split('?')[1];
            redirectUrl += '?' + queryString;
        }

        urlUtils.redirect301(res, redirectUrl);
    }
}

module.exports = RSSRouter;
