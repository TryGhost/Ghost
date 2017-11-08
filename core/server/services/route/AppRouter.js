var debug = require('ghost-ignition').debug('services:routes:AppRouter'),
    Router = require('./base/Router'),
    _router = new Router();

module.exports = {
    registerRouter(path, router) {
        debug('registerRouter for', path);
        _router.use(path, router);
    },
    router() {
        return _router.handle.bind(_router);
    }
};
