const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const common = require('../../lib/common');
const helpers = require('./helpers');
const ParentRouter = require('./ParentRouter');

class StaticRoutesRouter extends ParentRouter {
    constructor(key, object) {
        super('StaticRoutesRouter');

        this.route = {value: key};
        this.templates = object.templates || [];

        debug(this.route.value, this.templates);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use(this._prepareContext.bind(this));

        this.mountRoute(this.route.value, this._renderStaticRoute.bind(this));

        common.events.emit('router.created', this);
    }

    _prepareContext(req, res, next) {
        // @TODO: index.hbs as fallback for static routes O_O
        res._route = {
            type: 'custom',
            templates: this.templates,
            defaultTemplate: 'index'
        };

        res.locals.routerOptions = {
            context: []
        };

        next();
    }

    _renderStaticRoute(req, res) {
        debug('StaticRoutesRouter');
        helpers.renderer(req, res, {});
    }
}

module.exports = StaticRoutesRouter;
