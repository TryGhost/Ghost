const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');
const common = require('../../lib/common');

class StaticPagesRouter extends ParentRouter {
    constructor() {
        super('StaticPagesRouter');

        this.permalinks = {
            value: '/:slug/'
        };

        this.filter = 'page:true';

        this.permalinks.getValue = () => {
            return this.permalinks.value;
        };

        debug(this.permalinks);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use(this._prepareContext.bind(this));

        this.router().param('slug', this._respectDominantRouter.bind(this));

        // REGISTER: permalink for static pages
        this.mountRoute(this.permalinks.getValue(), controllers.entry);

        common.events.emit('router.created', this);
    }

    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'entry',
            filter: this.filter,
            permalinks: this.permalinks.getValue(),
            resourceType: this.getResourceType(),
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
