const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['authors', 'tags'];

const messages = {
    postNotFound: 'Post not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'previews',

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
        query(frame) {
            return models.Post.findOne(Object.assign({status: 'all'}, frame.data), frame.options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: tpl(messages.postNotFound)
                        });
                    }

                    return model;
                });
        }
    }
};

module.exports = controller;
