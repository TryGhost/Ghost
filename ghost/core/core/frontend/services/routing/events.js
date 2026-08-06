const EventEmitter = require('events').EventEmitter;

/**
 * Raised for each router mounted during activation.
 *
 * @typedef {Object} RouteRegistered
 * @property {string|null} path - route in domain notation, e.g. `/about/`.
 *   Null for routers with no route of their own: the static pages router,
 *   and taxonomies, which have no index route (`/tag/` does not exist).
 * @property {string} type - the kind of router, e.g. `CollectionRouter`
 * @property {string} id - the router's identifier
 */

/**
 * Frontend-internal routing domain events.
 *
 * Carries `RouteRegistered` and `RoutesReset` — the latter has no payload and
 * is raised before a reload clears the routers. Both are emitted by the router
 * manager and consumed only inside the frontend (the sitemap keeps its route
 * entries in sync from them). They used to ride the server's shared event bus
 * purely for historical reasons — nothing server-side listens to them.
 *
 * The payloads are plain data, so a consumer never depends on the internals
 * of the Express-backed router that happened to raise the event.
 */
module.exports = new EventEmitter();
