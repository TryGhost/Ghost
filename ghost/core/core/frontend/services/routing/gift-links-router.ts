import type {Request, Response, NextFunction, Router} from 'express';

// These modules use `module.exports =` / are untyped JS, so they're loaded via
// `require()` (matching their runtime CommonJS shape) rather than ESM imports.
/* eslint-disable @typescript-eslint/no-require-imports */

// ParentRouter is an untyped JS base class; describe only the members this
// router actually uses so the subclass type-checks without depending on the
// wider (untyped) routing internals.
interface ParentRouterBase {
    route: {value: string};
    router(): Router;
    mountRoute(path: string, controller: unknown): void;
}
const ParentRouter = require('./parent-router') as new (name: string) => ParentRouterBase;
const urlUtils = require('../../../shared/url-utils');
const controllers = require('./controllers');
/* eslint-enable @typescript-eslint/no-require-imports */

// Single source of truth for the `/g/` route prefix. Referenced by the
// router (route registration), the gift-links middleware (cache-bypass and
// path check) and frontend-caching, so the path lives in exactly one place.
// @NOTE: hardcoded, not configurable. `g` is intentionally short and distinct
// from the gift-subscriptions `/gift/` namespace.
const GIFT_LINK_PREFIX = '/g/';

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

        this.route = {value: GIFT_LINK_PREFIX};

        this._registerRoutes();
    }

    /**
     * @description Register all routes of this router.
     * @private
     */
    _registerRoutes(): void {
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
    _prepareContext(req: Request, res: Response & {routerOptions?: unknown}, next: NextFunction): void {
        res.routerOptions = {
            type: 'entry',
            context: ['giftLink']
        };

        next();
    }
}

// module.exports required - using `export` causes the module to fail to register
// when loaded via require(). Both the default (the class) and the named static
// (GIFT_LINK_PREFIX) are preserved for existing require() callers.
module.exports = GiftLinksRouter;
module.exports.GIFT_LINK_PREFIX = GIFT_LINK_PREFIX;
