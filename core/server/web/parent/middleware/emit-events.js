const {events} = require('../../../lib/common');
const INVALIDATE_ALL = '/*';

module.exports = function emitEvents(req, res, next) {
    res.on('finish', function triggerEvents() {
        if (res.get('X-Cache-Invalidate') === INVALIDATE_ALL) {
            events.emit('site.changed');
        }

        res.removeListener('finish', triggerEvents);
    });
    next();
};
