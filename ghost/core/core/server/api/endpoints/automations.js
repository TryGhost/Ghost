const domainEvents = require('@tryghost/domain-events');
const models = require('../../models');
const StartAutomationsPollEvent = require('../../services/automations/events/start-automations-poll-event');

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
            // TODO: NY-1265 - replace this static payload with persisted automation data.
            return {
                id: frame.data.id,
                slug: 'member-welcome-email-free',
                name: 'Welcome email',
                status: 'active',
                created_at: '2026-05-05T00:00:00.000Z',
                updated_at: '2026-05-05T00:00:00.000Z',
                actions: [{
                    id: '67f3f3f3f3f3f3f3f3f3f3f4',
                    type: 'delay',
                    data: {
                        delay_hours: 24
                    }
                }, {
                    id: '67f3f3f3f3f3f3f3f3f3f3f5',
                    type: 'send email',
                    data: {
                        email_subject: 'Welcome!',
                        email_lexical: '{"root":{"children":[]}}',
                        email_sender_name: null,
                        email_sender_email: null,
                        email_sender_reply_to: null,
                        email_design_setting_id: '680000000000000000000001'
                    }
                }],
                edges: [{
                    source_action_id: '67f3f3f3f3f3f3f3f3f3f3f4',
                    target_action_id: '67f3f3f3f3f3f3f3f3f3f3f5'
                }]
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
