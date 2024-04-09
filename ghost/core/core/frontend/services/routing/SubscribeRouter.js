const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');

/**
 * @description Subscribe Router.
 *
 * "/subscribe/" -> Subscribe Router
 */
class SubscribeRouter extends ParentRouter {
    constructor() {
        super('SubscribeRouter');

        // @NOTE: hardcoded, not configurable
        this.route = {value: '/confirm_signup/'};
        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        this.mountRoute(this.route.value, controllers.subscribe);
    }
}

module.exports = SubscribeRouter;
