const mailEvents = require('../../services/mail-events');

module.exports = {
    docName: 'mail_events',
    async add(frame) {
        return mailEvents.service.processPayload(frame.data);
    }
};
