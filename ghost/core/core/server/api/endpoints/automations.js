const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('../../services/welcome-email-automations/events/start-automations-poll-event');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automations',

    poll: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'automations',
            method: 'poll'
        },
        query() {
            domainEvents.dispatch(StartAutomationsPollEvent.create());
        }
    }
};

module.exports = controller;
