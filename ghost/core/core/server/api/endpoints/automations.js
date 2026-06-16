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
