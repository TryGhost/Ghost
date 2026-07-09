const jobQueue = require('../../services/jobs/queue').default;
const SendGiftRemindersJob = require('../../services/gifts/jobs/send-gift-reminders-job').default;

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
            return jobQueue.dispatch(new SendGiftRemindersJob());
        }
    }
};

module.exports = controller;
