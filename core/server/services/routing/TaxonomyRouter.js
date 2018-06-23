const debug = require('ghost-ignition').debug('services:routing:taxonomy-router');
const common = require('../../lib/common');
const ParentRouter = require('./ParentRouter');
const RSSRouter = require('./RSSRouter');
const urlService = require('../url');
const controllers = require('./controllers');
const middlewares = require('./middlewares');
const RESOURCE_CONFIG = require('./assets/resource-config');

class TaxonomyRouter extends ParentRouter {
    constructor(key, permalinks) {
        super('Taxonomy');

        this.taxonomyKey = key;

        this.permalinks = {
            value: permalinks
        };

        this.permalinks.getValue = () => {
            return this.permalinks.value;
        };

        debug(this.permalinks);

        this._registerRoutes();
    }

    _registerRoutes() {
        // REGISTER: context middleware
        this.router().use(this._prepareContext.bind(this));

        // REGISTER: enable rss by default
        this.mountRouter(this.permalinks.getValue(), new RSSRouter().router());

        // REGISTER: e.g. /tag/:slug/
        this.mountRoute(this.permalinks.getValue(), controllers.collection);

        // REGISTER: enable pagination for each taxonomy by default
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.permalinks.value, 'page', ':page(\\d+)'), controllers.collection);

        this.mountRoute(urlService.utils.urlJoin(this.permalinks.value, 'edit'), this._redirectEditOption.bind(this));

        common.events.emit('router.created', this);
    }

    _prepareContext(req, res, next) {
        res.locals.routerOptions = {
            name: this.taxonomyKey,
            permalinks: this.permalinks.getValue(),
            data: {[this.taxonomyKey]: _.omit(RESOURCE_CONFIG.QUERY[this.taxonomyKey], 'alias')},
            filter: RESOURCE_CONFIG.TAXONOMIES[this.taxonomyKey].filter,
            type: this.getType(),
            context: [this.taxonomyKey],
            slugTemplate: true,
            identifier: this.identifier
        };

        res._route = {
            type: 'collection'
        };

        next();
    }

    _redirectEditOption(req, res) {
        urlService.utils.redirectToAdmin(302, res, RESOURCE_CONFIG.TAXONOMIES[this.taxonomyKey].editRedirect.replace(':slug', req.params.slug));
    }

    getType() {
        return RESOURCE_CONFIG.QUERY[this.taxonomyKey].resource;
    }

    getRoute() {
        return null;
    }
}

module.exports = TaxonomyRouter;
