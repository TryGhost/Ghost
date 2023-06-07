// Used to call the slack ping service, iirc this was done to avoid circular deps a long time ago
const events = require('../../lib/common/events');

module.exports = {
    docName: 'slack',
    sendTest: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        query() {
            events.emit('slack.test');
        }
    }
};
