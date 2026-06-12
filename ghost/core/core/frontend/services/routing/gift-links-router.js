const ParentRouter = require('./parent-router');
const urlUtils = require('../../../shared/url-utils');
const controllers = require('./controllers');

/**
 * @description Gift Link Router — mounts `/g/:slug/` for tokenised
 * gift-link reads. Modelled on PreviewRouter / EmailRouter: a dedicated
 * top-level prefix outside the theme's collection space, so its cache
 * boundary is path-based (Fastly bypass on `/g/*`).
 *
 * Token validation, slug-match enforcement, and the redirect-on-invalid
 * fallback live in the controller (`controllers/gift-links.js`).
 */
class GiftLinksRouter extends ParentRouter {
    constructor() {
        super('GiftLinksRouter');

        // @NOTE: hardcoded, not configurable. `g` is intentionally short and
        // distinct from the gift-subscriptions `/gift/` namespace.
        this.route = {value: '/g/'};

        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes() {
        // REGISTER: prepare context
        this.router().use(this._prepareContext.bind(this));

        // REGISTER: gift link route — `:slug` is the post/page slug;
        // `?key=TOKEN` is validated by the controller.
        this.mountRoute(urlUtils.urlJoin(this.route.value, ':slug'), controllers.giftLinks);
    }

    /**
     * @description Prepare context for further middleware/controllers.
     * The controller may override `routerOptions.context` once it knows
     * whether the target is a post or a page (so template selection
     * matches the canonical render).
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @private
     */
    _prepareContext(req, res, next) {
        res.routerOptions = {
            type: 'entry',
            context: ['giftLink']
        };

        next();
    }
}

module.exports = GiftLinksRouter;
