const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['authors', 'tags', 'tiers'];

const messages = {
    postNotFound: 'Post not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_post',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'include'
        ],
        data: [
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            },
            data: {
                uuid: {
                    required: true
                }
            }
        },
        async query(frame) {
            const model = await models.Post.findOne(Object.assign(frame.data, {status: 'sent'}), frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.postNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
