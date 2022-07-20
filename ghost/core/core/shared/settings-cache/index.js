/**
 * Why hasn't this been moved to @tryghost/settings-cache yet?
 *
 * - It currently still couples the frontend and server together in a weird way via the event system
 * - See the notes in core/server/lib/common/events
 * - There's also a plan to introduce a proper caching layer, and rewrite this on top of that
 * - Finally, I'm not sure if this shouldn't be two things - a cache, and a cache manager (the update system)
 */
module.exports = require('./cache');
