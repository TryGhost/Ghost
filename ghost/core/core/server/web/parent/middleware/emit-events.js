const INVALIDATE_ALL = '/*';

// Emit the site.changed event, a special model event used for webhooks
const events = require('../../../lib/common/events');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function emitEvents(req, res, next) {
    res.on('finish', function triggerEvents() {
        if (res.get('X-Cache-Invalidate') === INVALIDATE_ALL) {
            events.emit('site.changed');
        }

        res.removeListener('finish', triggerEvents);
    });
    next();
};
