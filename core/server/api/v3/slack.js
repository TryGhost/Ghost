const {events} = require('../../lib/common');

module.exports = {
    docName: 'slack',
    sendTest: {
        permissions: false,
        query() {
            events.emit('slack.test');
        }
    }
};
