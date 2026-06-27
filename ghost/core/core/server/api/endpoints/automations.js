const automationsApi = require('../../services/automations/automations-api');

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
        permissions: true,
        async query(frame) {
            return await automationsApi.edit(frame.options.id, frame.data?.automations?.[0]);
        }
    },

    poll: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'automations',
            method: 'poll'
        },
        query() {
            automationsApi.requestPoll();

            // The Ghost(Pro) Scheduler invokes this endpoint as a timed callback and
            // requires the response to be a valid JSON object. An empty body (e.g. a
            // 204) is treated as a failed job and retried, so we return a small object.
            return {polled: true};
        }
    }
};

module.exports = controller;
