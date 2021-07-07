const debug = require('@tryghost/debug')('routing:static-routes-router');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const RSSRouter = require('./RSSRouter');
const controllers = require('./controllers');
const middlewares = require('./middlewares');
const ParentRouter = require('./ParentRouter');

// This emits its own routing events
const events = require('../../../server/lib/common/events');

/**
 * @description Template routes allow you to map individual URLs to specific template files within a Ghost theme
 */
class StaticRoutesRouter extends ParentRouter {
    constructor(mainRoute, object) {
        super('StaticRoutesRouter');

        this.route = {value: mainRoute};
        this.templates = object.templates || [];
        this.data = object.data || {query: {}, router: {}};
        this.routerName = mainRoute === '/' ? 'index' : mainRoute.replace(/\//g, '');

        debug(this.route.value, this.templates);

        // CASE 1: Route is channel (controller: channel) -  a stream of posts
        // CASE 2: Route is just a static page e.g. landing page
        if (this.isChannel(object)) {
            this.templates = this.templates.reverse();
            this.rss = object.rss !== false;
            this.filter = object.filter;
            this.limit = object.limit;
            this.order = object.order;

            this.controller = object.controller;

            debug(this.route.value, this.templates, this.filter, this.data);
            this._registerChannelRoutes();
        } else {
            this.contentType = object.content_type;
            debug(this.route.value, this.templates);
            this._registerStaticRoute();
        }
    }

    /**
     * @description Register all channel routes of this router (...if the router is a channel)
     * @private
     */
    _registerChannelRoutes() {
        // REGISTER: prepare context object
        this.router().use(this._prepareChannelContext.bind(this));

        // REGISTER: is rss enabled?
        if (this.rss) {
            this.rssRouter = new RSSRouter();
            this.mountRouter(this.route.value, this.rssRouter.router());
        }

        // REGISTER: channel route
        this.mountRoute(this.route.value, controllers[this.controller]);

        // REGISTER: pagination
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlUtils.urlJoin(this.route.value, 'page', ':page(\\d+)'), controllers[this.controller]);

        events.emit('router.created', this);
    }

    /**
     * @description Prepare channel context for further middlewares/controllers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareChannelContext(req, res, next) {
        res.routerOptions = {
            type: this.controller,
            name: this.routerName,
            context: [this.routerName],
            filter: this.filter,
            limit: this.limit,
            order: this.order,
            data: this.data.query,
            templates: this.templates
        };

        next();
    }

    /**
     * @description Register all static routes of this router (...if the router is just a static route)
     * @private
     */
    _registerStaticRoute() {
        // REGISTER: prepare context object
        this.router().use(this._prepareStaticRouteContext.bind(this));

        // REGISTER: static route
        this.mountRoute(this.route.value, controllers.static);

        events.emit('router.created', this);
    }

    /**
     * @description Prepare static route context for further middlewares/controllers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareStaticRouteContext(req, res, next) {
        res.routerOptions = {
            type: 'custom',
            templates: this.templates,
            defaultTemplate: () => {
                throw new errors.IncorrectUsageError({
                    message: `Missing template ${res.routerOptions.templates.map(x => `${x}.hbs`).join(', ')} for route "${req.originalUrl}".`
                });
            },
            data: this.data.query,
            context: [this.routerName],
            contentType: this.contentType
        };

        next();
    }

    /**
     * @description Helper function to figure out if this router is a channel.
     * @param {Object} object
     * @returns {boolean}
     */
    isChannel(object) {
        if (object && object.controller && object.controller === 'channel') {
            return true;
        }

        return this.controller === 'channel';
    }
}

module.exports = StaticRoutesRouter;
