const EventEmitter = require('events').EventEmitter;

/**
 * Frontend-internal routing events.
 *
 * Carries `router.created` and `routers.reset`, which are emitted by the
 * router manager and consumed only inside the frontend (the sitemap keeps
 * its route entries in sync from them). They used to ride the server's
 * shared event bus purely for historical reasons — nothing server-side
 * listens to them.
 */
module.exports = new EventEmitter();
