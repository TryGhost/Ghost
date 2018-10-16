const webhookService = require('../../../services/webhooks');
const SITE_CHANGE_EVENT = 'site_changed';

module.exports = function triggerWebhooks(req, res, next) {
    res.on('finish', function triggerWebhookEvents() {
        if (res.get('X-Cache-Invalidate') === '/*') {
            webhookService.trigger(SITE_CHANGE_EVENT, {});
        }

        res.removeListener('finish', triggerWebhookEvents);
    });
    next();
};
