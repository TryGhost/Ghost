const cache = new WeakMap();

/**
 * Hands each of an endpoint's queries the site as its second argument, so an
 * endpoint that calls into a domain is given the site and never imports it.
 *
 * This is the one place the API layer reaches for the site. It leaves when the
 * API framework is handed the site for each request.
 *
 * @template {Record<string, unknown>} Controller
 * @param {Controller} controller
 * @returns {Controller}
 */
module.exports = function withSite(controller) {
  let wrapped = cache.get(controller);
  if (!wrapped) {
    const { site } = require('../../../../../bootstrap/site');
    wrapped = {};
    for (const [name, method] of Object.entries(controller)) {
      wrapped[name] =
        method && typeof method.query === 'function'
          ? { ...method, query: (frame) => method.query(frame, site) }
          : method;
    }
    cache.set(controller, wrapped);
  }
  return wrapped;
};
