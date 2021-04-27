const events = require('../../lib/common/events');

module.exports = {
    docName: 'slack',
    sendTest: {
        permissions: false,
        query() {
            events.emit('slack.test');
        }
    }
};
