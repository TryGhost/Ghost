const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    newsletterNotFound: 'Newsletter not found.'
};

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

    read: {
        options: [
            'fields',
            'debug',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
        ],
        data: [
            'id',
            'slug',
            'uuid'
        ],
        permissions: true,
        async query(frame) {
            const newsletter = models.Newsletter.findOne(frame.data, frame.options);

            if (!newsletter) {
                throw new errors.NotFoundError({
                    message: tpl(messages.newsletterNotFound)
                });
            }
            return newsletter;
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
