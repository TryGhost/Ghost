const models = require('../../models');

module.exports = {
    docName: 'newsletters',

    browse: {
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        query(frame) {
            return models.Newsletter.findPage(frame.options);
        }
    },

    add: {
        statusCode: 201,
        permissions: true,
        async query(frame) {
            return models.Newsletter.add(frame.data.newsletters[0], frame.options);
        }
    },

    edit: {
        headers: {},
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return models.Newsletter.edit(frame.data.newsletters[0], frame.options);
        }
    }
};
