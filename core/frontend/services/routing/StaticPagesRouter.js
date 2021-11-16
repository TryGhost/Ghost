const debug = require('@tryghost/debug')('routing:static-pages-router');
const urlUtils = require('../../../shared/url-utils');
const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');

/**
 * @description Resource: pages
 */
class StaticPagesRouter extends ParentRouter {
    constructor(RESOURCE_CONFIG, routerCreated) {
        super('StaticPagesRouter');

        this.RESOURCE_CONFIG = RESOURCE_CONFIG.QUERY.page;
        this.routerCreated = routerCreated;

        // @NOTE: Permalink is always /:slug, not configure able
        this.permalinks = {
            value: '/:slug/'
        };

        this.permalinks.getValue = (options = {}) => {
            options = options || {};

            // @NOTE: url options are only required when registering urls in express.
            //        e.g. the UrlService will access the routes and doesn't want to know about possible url options
            if (options.withUrlOptions) {
                return urlUtils.urlJoin(this.permalinks.value, '/:options(edit)?/');
            }

            return this.permalinks.value;
        };

        debug(this.permalinks);

        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // REGISTER: prepare context
        this.router().use(this._prepareContext.bind(this));

        this.router().param('slug', this._respectDominantRouter.bind(this));

        // REGISTER: permalink for static pages
        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);

        this.routerCreated(this);
    }

    /**
     * @description Prepare context for futher middleware/controllers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'entry',
            filter: this.filter,
            permalinks: this.permalinks.getValue({withUrlOptions: true}),
            resourceType: this.getResourceType(),
            query: this.RESOURCE_CONFIG,
            context: ['page']
        };

        next();
    }

    /**
     * @description Resource type.
     * @returns {string}
     */
    getResourceType() {
        return 'pages';
    }

    /**
     * @description This router has no index/default route. "/:slug/" is dynamic.
     * @returns {null}
     */
    getRoute() {
        return null;
    }

    reset() {}
}

module.exports = StaticPagesRouter;
