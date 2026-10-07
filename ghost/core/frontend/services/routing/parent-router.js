/**
 * # Parent Router
 *
 * A wrapper around express.Router, which is controlled in Ghost.
 *
 * Intended to be extended anywhere that routes need to be registered in Ghost.
 * Only allows for .use and .get at the moment - we don't have clear use-cases for anything else yet.
 */

const debug = require('@tryghost/debug')('routing:parent-router');

const express = require('../../../shared/express');
const url = require('url');
const security = require('@tryghost/security');
const { resolveResourceRead, resolveRouteEntry } = require('./api-adapter');
const urlUtils = require('../../../shared/url-utils').default;
const { getMarkdownPath } = require('../llms/markdown');
const controllers = require('./controllers');
const registry = require('./registry');

/**
 * @description Inherited express router, which gives control to us.
 *
 * Purposes:
 *   - give the router a correct name
 *   - give the router a correct parent
 *
 * @param {Object} options
 * @returns {Express-Router}
 * @constructor
 */
function GhostRouter(options) {
  const router = express.Router('Parent', options);

  function innerRouter(req, res, next) {
    return innerRouter.handle(req, res, next);
  }

  Object.setPrototypeOf(innerRouter, router);

  Object.defineProperty(innerRouter, 'name', {
    value: options.parent.name,
    writable: false,
  });

  innerRouter.parent = options.parent;
  return innerRouter;
}

class ParentRouter {
  constructor(name) {
    this.identifier = security.identifier.uid(10);

    this.name = name;
    this._router = GhostRouter({ mergeParams: true, parent: this });
  }

  /**
   * @description Helper function to find the site router in the express router stack.
   * @param {Object} req
   * @returns {import('express').Router}
   * @private
   */
  _getSiteRouter(req) {
    let siteRouter = null;

    req.app._router.stack.every((router) => {
      if (router.name === 'SiteRouter') {
        siteRouter = router;
        return false;
      }

      return true;
    });

    return siteRouter;
  }

  /**
   * @description Helper function to handle redirects across routers.
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   * @param {string} slug
   * @private
   */
  _respectDominantRouter(req, res, next, slug) {
    const siteRouter = this._getSiteRouter(req);
    let targetRouter = null;

    // CASE: iterate over routers and check whether a router has a redirect for the target slug enabled.
    siteRouter.handle.stack.every((router) => {
      if (
        router.handle.parent &&
        router.handle.parent.isRedirectEnabled &&
        router.handle.parent.isRedirectEnabled(this.getResourceType(), slug)
      ) {
        targetRouter = router.handle.parent;
        return false;
      }

      return true;
    });

    if (targetRouter) {
      debug('_respectDominantRouter');

      let pathname = url.parse(req.url).pathname.endsWith('.md')
        ? targetRouter.getMarkdownRoute()
        : null;

      if (!pathname) {
        // CASE: transform /tag/:slug/ -> /tag/[a-zA-Z0-9-_]+/ to able to find url pieces to append
        // e.g. /tag/bacon/page/2/  -> 'page/2' (to append)
        // e.g. /bacon/welcome/     -> '' (nothing to append)
        const matchPath = this.permalinks.getValue().replace(/:\w+/g, '[a-zA-Z0-9-_]+');
        const toAppend = req.url.replace(new RegExp(matchPath), '');
        pathname = urlUtils.createUrl(
          urlUtils.urlJoin(targetRouter.getRoute(), toAppend),
          false,
          false,
          true,
        );
      }

      return urlUtils.redirect301(
        res,
        url.format({
          pathname,
          search: url.parse(req.originalUrl).search,
        }),
      );
    }

    next();
  }

  /**
   * @description Mount a router on a router (sub-routing)
   * @param {String | import('express').Router} path
   * @param {import('express').Router} [router]
   */
  mountRouter(path, router) {
    if (arguments.length === 1) {
      router = path;
      debug(this.name + ': mountRouter: ' + router.name);
      this._router.use(router);
    } else {
      registry.setRoute(this.name, path);
      debug(this.name + ': mountRouter: ' + router.name + ' at ' + path);
      this._router.use(path, router);
    }
  }

  /**
   * @description Mount a route on this router.
   * @param {string} path
   * @param {Function} controller
   */
  mountRoute(path, controller) {
    debug(this.name + ': mountRoute for', path, controller.name);
    registry.setRoute(this.name, path);
    this._router.post(path, controller);
    this._router.get(path, controller);
  }

  /**
   * @description Very important function to get the actual express router, which satisfies express.
   * @returns {import('express').Router}
   */
  router() {
    return this._router;
  }

  /**
   * @description Get configured permalinks of this router.
   * @returns {Object}
   */
  getPermalinks() {
    return this.permalinks;
  }

  /**
   * @description Get main route of this router.
   *
   * Will return the full route including subdirectory. Do not use this function to mount routes for now,
   * because the subdirectory is already mounted as exclusive feature (independent of dynamic routing).
   *
   * @param {Object} options
   * @returns {string}
   */
  getRoute(options) {
    options = options || {};

    return urlUtils.createUrl(this.route.value, options.absolute);
  }

  /**
   * @description Get the `.md` route of this router, including subdirectory. Only routes whose
   * data reads a single post or page have one.
   * @returns {string|null}
   */
  getMarkdownRoute() {
    if (!this.route || !resolveRouteEntry(this.data)) {
      return null;
    }

    return urlUtils.createUrl(getMarkdownPath(this.route.value));
  }

  /**
   * @description Serve the post or page this route's data reads as markdown at `<route>.md`.
   */
  mountMarkdownRoute() {
    const markdownRoute = this.getMarkdownRoute();

    if (!markdownRoute) {
      return;
    }

    this.mountRoute(getMarkdownPath(this.route.value), (req, res, next) => {
      res.routerOptions.isMarkdownRequest = true;
      res.routerOptions.canonicalPath = this.getRoute();
      res.routerOptions.markdownPath = markdownRoute;
      return controllers.routeMarkdown(req, res, next);
    });
  }

  /**
   * @description Figure out if the router has a redirect enabled.
   *
   * A route claims a resource by reading it: `data: tag.bacon` on this router
   * means /tag/bacon/ should redirect here from wherever else it lives. Only
   * `read` entries claim a slug, and an entry can opt out with `redirect: false`.
   *
   * @param {string} routerType
   * @param {string} slug
   * @returns {boolean}
   */
  isRedirectEnabled(routerType, slug) {
    debug('isRedirectEnabled', this.name, this.route && this.route.value, routerType, slug);

    if (!this.data) {
      return false;
    }

    // Top-level shorthand (`data: tag.bacon`) is a single unnamed entry.
    const entries = typeof this.data === 'string' ? [this.data] : Object.values(this.data);

    return entries.some((entry) => {
      if (typeof entry !== 'string' && entry.redirect === false) {
        return false;
      }

      const read = resolveResourceRead(entry);

      return !!read && read.resource === routerType && read.slug === slug;
    });
  }

  reset() {}
}

module.exports = ParentRouter;
