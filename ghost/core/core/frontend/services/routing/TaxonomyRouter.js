const debug = require('@tryghost/debug')('routing:taxonomy-router');
const config = require('../../../shared/config');
const ParentRouter = require('./ParentRouter');
const RSSRouter = require('./RSSRouter');
const urlUtils = require('../../../shared/url-utils');
const controllers = require('./controllers');
const middleware = require('./middleware');

/**
 * @description Taxonomies are groupings of posts based on a common relation.
 * Taxonomies do not change the url of a resource.
 */
class TaxonomyRouter extends ParentRouter {
    constructor(key, permalinks, RESOURCE_CONFIG, routerCreated) {
        super('Taxonomy');

        this.taxonomyKey = key;
        this.RESOURCE_CONFIG = RESOURCE_CONFIG;

        this.permalinks = {
            value: permalinks
        };

        this.permalinks.getValue = () => {
            return this.permalinks.value;
        };

        this.routerCreated = routerCreated;

        debug(this.permalinks);

        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // REGISTER: context middleware
        this.router().use(this._prepareContext.bind(this));

        // REGISTER: redirects across routers
        this.router().param('slug', this._respectDominantRouter.bind(this));

        // REGISTER: enable rss by default
        this.rssRouter = new RSSRouter();
        this.mountRouter(this.permalinks.getValue(), this.rssRouter.router());

        // REGISTER: e.g. /tag/:slug/
        this.mountRoute(this.permalinks.getValue(), controllers.channel);

        // REGISTER: enable pagination for each taxonomy by default
        this.router().param('page', middleware.pageParam);
        this.mountRoute(urlUtils.urlJoin(this.permalinks.value, 'page', ':page(\\d+)'), controllers.channel);

        // REGISTER: edit redirect to admin client e.g. /tag/:slug/edit
        if (config.get('admin:redirects')) {
            this.mountRoute(urlUtils.urlJoin(this.permalinks.value, 'edit'), this._redirectEditOption.bind(this));
        }

        this.routerCreated(this);
    }

    /**
     * @description Prepare context for routing middleware/controllers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'channel',
            name: this.taxonomyKey,
            permalinks: this.permalinks.getValue(),
            data: {[this.taxonomyKey]: this.RESOURCE_CONFIG.QUERY[this.taxonomyKey]},
            filter: this.RESOURCE_CONFIG.TAXONOMIES[this.taxonomyKey].filter,
            resourceType: this.getResourceType(),
            context: [this.taxonomyKey],
            slugTemplate: true,
            identifier: this.identifier
        };

        next();
    }

    /**
     * @description Simple controller function to redirect /edit to admin client
     * @param {Object} req
     * @param {Object} res
     * @private
     */
    _redirectEditOption(req, res) {
        urlUtils.redirectToAdmin(302, res, this.RESOURCE_CONFIG.TAXONOMIES[this.taxonomyKey].editRedirect.replace(':slug', req.params.slug));
    }

    /**
     * @description Get resource type e.g. tags or authors
     * @returns {*}
     */
    getResourceType() {
        return this.RESOURCE_CONFIG.TAXONOMIES[this.taxonomyKey].resource;
    }

    /**
     * @description There is no default/index route for taxonomies e.g. /tag/ does not exist, only /tag/:slug/
     * @returns {null}
     */
    getRoute() {
        return null;
    }
}

module.exports = TaxonomyRouter;
