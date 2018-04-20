const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const common = require('../../lib/common');
const helpers = require('./helpers');
const ParentRouter = require('./ParentRouter');

class StaticRoutesRouter extends ParentRouter {
    constructor(key, template) {
        super('StaticRoutesRouter');

        this.route = {value: key};
        this.template = template;

        debug(this.route.value, this.template);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use(this._prepareContext.bind(this));

        this.mountRoute(this.route.value, this._renderStaticRoute.bind(this));

        common.events.emit('router.created', this);
    }

    _prepareContext(req, res, next) {
        res._route = {
            type: 'custom',
            templateName: this.template,
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
