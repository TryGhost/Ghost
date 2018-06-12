const ParentRouter = require('./ParentRouter');
const urlService = require('../url');

const controllers = require('./controllers');
const middlewares = require('./middlewares');

class RSSRouter extends ParentRouter {
    constructor() {
        super('RSSRouter');

        this.route = {value: '/rss/'};
        this._registerRoutes();
    }

    _registerRoutes() {
        this.mountRoute(this.route.value, controllers.rss);

        // REGISTER: pagination
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.route.value, ':page(\\d+)'), controllers.rss);

        // REGISTER: redirect rule
        this.mountRoute('/feed/', this._redirectFeedRequest.bind(this));
    }

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
