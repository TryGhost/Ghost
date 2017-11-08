var debug = require('ghost-ignition').debug('services:routes:SiteRouter'),
    Router = require('./base/Router'),
    _router = new Router(),
    routes = [];
/**
 * We expose a very limited amount of express.Router via specialist methods
 */
module.exports = {
    mountRouter(router) {
        debug('mountRouter', router.name);
        _router.use(router);
    },

    mountRoute(path, controller) {
        debug('mountRoute for', path, controller.name);
        routes.push(path);
        _router.get(path, controller);
    },

    router() {
        return _router.handle.bind(_router);
    }
};

