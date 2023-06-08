const {createMailEventService} = require('../../services/mail-events');

module.exports = {
    docName: 'mail_events',
    async add(frame) {
        return createMailEventService()
            .processPayload(frame.data);
    }
};
