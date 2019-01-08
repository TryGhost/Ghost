const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const urlService = require('../url');
const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');
const common = require('../../lib/common');

class StaticPagesRouter extends ParentRouter {
    constructor(RESOURCE_CONFIG) {
        super('StaticPagesRouter');

        this.RESOURCE_CONFIG = RESOURCE_CONFIG.QUERY.page;

        this.permalinks = {
            value: '/:slug/'
        };

        this.permalinks.getValue = (options = {}) => {
            options = options || {};

            // @NOTE: url options are only required when registering urls in express.
            //        e.g. the UrlService will access the routes and doesn't want to know about possible url options
            if (options.withUrlOptions) {
                return urlService.utils.urlJoin(this.permalinks.value, '/:options(edit)?/');
            }

            return this.permalinks.value;
        };

        debug(this.permalinks);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use(this._prepareContext.bind(this));

        this.router().param('slug', this._respectDominantRouter.bind(this));

        // REGISTER: permalink for static pages
        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);

        common.events.emit('router.created', this);
    }

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

    getResourceType() {
        return 'pages';
    }

    getRoute() {
        return null;
    }

    reset() {}
}

module.exports = StaticPagesRouter;
