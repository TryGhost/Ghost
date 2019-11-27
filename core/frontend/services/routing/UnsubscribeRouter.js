const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');

/**
 * @description Unsubscribe Router.
 *
 * "/unsubscribe/" -> Unsubscribe Router
 */
class UnsubscribeRouter extends ParentRouter {
    constructor() {
        super('UnsubscribeRouter');

        // @NOTE: hardcoded, not configurable
        this.route = {value: '/unsubscribe/'};
        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        this.mountRoute(this.route.value, controllers.unsubscribe);
    }
}

module.exports = UnsubscribeRouter;
