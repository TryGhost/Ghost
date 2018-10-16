const common = require('../../../lib/common');

module.exports = function emitEvents(req, res, next) {
    res.on('finish', function triggerWebhookEvents() {
        if (res.get('X-Cache-Invalidate') === '/*') {
            common.events.emit('site.changed');
        }

        res.removeListener('finish', triggerWebhookEvents);
    });
    next();
};
