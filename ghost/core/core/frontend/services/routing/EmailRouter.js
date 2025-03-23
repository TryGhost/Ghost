const ParentRouter = require('./ParentRouter');
const urlUtils = require('../../../shared/url-utils');
const controllers = require('./controllers');

/**
 * @description Email Router.
 */
class EmailRouter extends ParentRouter {
    constructor(RESOURCE_CONFIG) {
        super('EmailRouter');

        this.RESOURCE_CONFIG = RESOURCE_CONFIG.QUERY.email;

        // @NOTE: hardcoded, not configurable
        this.route = {value: '/email/'};

        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // REGISTER: prepare context
        this.router().use(this._prepareContext.bind(this));

        // REGISTER: actual email route
        this.mountRoute(urlUtils.urlJoin(this.route.value, ':uuid', ':options?'), controllers.email);
    }

    /**
     * @description Prepare context for further middleware/controllers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'entry',
            query: this.RESOURCE_CONFIG,
            context: ['emailPost']
        };

        next();
    }
}

module.exports = EmailRouter;
