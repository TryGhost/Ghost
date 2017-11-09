/**
 * # Route Service
 *
 * Note: routes are patterns, not individual URLs, which have either
 * subrouters, or controllers mounted on them. There are not that many routes.
 *
 * The route service is intended to:
 * - handle the mounting of all the routes throughout the bootup sequence
 * - keep track of the registered routes, and what they have mounted on them
 * - provide a way for apps to register routes
 * - keep routes being served in a sane order
 *
 * The route service does not handle:
 * - redirects
 * - assets
 * These both happen prior to the routeService router being mounted
 */

// This is the main router, that gets mounted in the express app in /site
module.exports.siteRouter = require('./site-router');

// We expose this via the App Proxy, so that Apps can register routes
module.exports.appRouter = require('./app-router');

// Classes for other parts of Ghost to extend
module.exports.ParentRouter = require('./ParentRouter');
