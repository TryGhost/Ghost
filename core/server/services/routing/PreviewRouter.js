const ParentRouter = require('./ParentRouter');
const urlService = require('../url');
const controllers = require('./controllers');

class PreviewRouter extends ParentRouter {
    constructor(RESOURCE_CONFIG) {
        super('PreviewRouter');

        this.RESOURCE_CONFIG = RESOURCE_CONFIG.QUERY.preview;

        this.route = {value: '/p/'};

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use(this._prepareContext.bind(this));

        this.mountRoute(urlService.utils.urlJoin(this.route.value, ':uuid', ':options?'), controllers.preview);
    }

    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'entry',
            query: this.RESOURCE_CONFIG,
            context: ['preview']
        };

        next();
    }
}

module.exports = PreviewRouter;
