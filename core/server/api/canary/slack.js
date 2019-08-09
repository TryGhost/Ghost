const common = require('../../lib/common');

module.exports = {
    docName: 'slack',
    sendTest: {
        permissions: false,
        query() {
            common.events.emit('slack.test');
        }
    }
};
