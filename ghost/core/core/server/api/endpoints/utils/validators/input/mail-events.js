const mailEvents = require('../../../../../services/mail-events');

module.exports = {
    add(apiConfig, frame) {
        mailEvents.service.validatePayload(frame.data);
    }
};
