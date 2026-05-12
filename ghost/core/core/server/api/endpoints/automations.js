const errors = require('@tryghost/errors');
const automationsApi = require('../../services/automations/automations-api');

const VALID_AUTOMATION_STATUSES = ['active', 'inactive'];

const messages = {
    invalidAutomationStatus: 'Automation status must be one of: active, inactive.',
    invalidAutomationStatusHelp: 'Use "active" or "inactive" for automation status.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query() {
            return await automationsApi.browse();
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
        async query(frame) {
            return await automationsApi.read(frame.data.id);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation(frame) {
            const status = frame.data?.automations?.[0]?.status;

            if (!VALID_AUTOMATION_STATUSES.includes(status)) {
                throw new errors.ValidationError({
                    message: messages.invalidAutomationStatus,
                    context: status === undefined ? undefined : `Received status "${status}".`,
                    help: messages.invalidAutomationStatusHelp,
                    property: 'status'
                });
            }
        },
        permissions: true,
        async query(frame) {
            return await automationsApi.edit(frame.options.id, frame.data.automations[0]);
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
            automationsApi.requestPoll();
        }
    }
};

module.exports = controller;
