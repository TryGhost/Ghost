const mailEvents = require('../../services/mail-events');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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

module.exports = controller;
