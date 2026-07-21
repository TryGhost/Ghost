const automationsApi = require('../../services/automations/automations-api');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automation_action_links',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'automation_id',
            'action_id'
        ],
        validation: {
            options: {
                automation_id: {
                    required: true
                },
                action_id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automations',
            method: 'read'
        },
        async query(frame) {
            return {
                data: await automationsApi.browseActionLinks(
                    frame.options.automation_id,
                    frame.options.action_id
                )
            };
        }
    }
};

module.exports = controller;
