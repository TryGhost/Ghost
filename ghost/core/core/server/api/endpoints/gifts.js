const domainEvents = require('@tryghost/domain-events');
const StartGiftReminderFlushEvent = require('../../services/gifts/events/start-gift-reminder-flush-event');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'gifts',

    flushReminders: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'gifts',
            method: 'flushReminders'
        },
        query() {
            domainEvents.dispatch(StartGiftReminderFlushEvent.create());
        }
    }
};

module.exports = controller;
