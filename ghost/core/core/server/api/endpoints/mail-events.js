const mailEvents = require('../../services/mail-events');

module.exports = {
    docName: 'mail_events',
    add: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            return mailEvents.service.processPayload(frame.data);
        }
    }
};
