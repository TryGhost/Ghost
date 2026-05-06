const domainEvents = require('@tryghost/domain-events');
const models = require('../../models');
const StartAutomationsPollEvent = require('../../services/welcome-email-automations/events/start-automations-poll-event');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query() {
            const automations = await models.WelcomeEmailAutomation.findAll();
            return {
                data: automations.map(automation => ({
                    id: automation.get('id'),
                    name: automation.get('name'),
                    slug: automation.get('slug'),
                    status: automation.get('status')
                }))
            };
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            return {
                id: frame.data.id,
                name: 'Welcome email',
                status: 'active'
            };
        }
    },

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
