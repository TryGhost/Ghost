const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const ALLOWED_INCLUDES = ['count.posts'];

const messages = {
    tagNotFound: 'Tag not found.'
};

module.exports = {
    docName: 'tags',

    browse: {
        options: [
            'include',
            'filter',
            'fields',
            'limit',
            'order',
            'page',
            'debug'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.TagPublic.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include',
            'filter',
            'fields',
            'debug'
        ],
        data: [
            'id',
            'slug',
            'visibility'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.TagPublic.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.tagNotFound)
                        }));
                    }

                    return model;
                });
        }
    }
};
