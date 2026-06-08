const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const ALLOWED_INCLUDES = ['count.posts'];

const messages = {
    tagNotFound: 'Tag not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tags',

    browse: {
        headers: {
            cacheInvalidate: false
        },
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
            return models.Tag.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame) {
            const model = await models.Tag.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.tagNotFound)
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'include'
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
            return models.Tag.add(frame.data.tags[0], frame.options);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const model = await models.Tag.edit(frame.data.tags[0], frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.tagNotFound)
                });
            }

            if (model.wasChanged()) {
                frame.setHeader('X-Cache-Invalidate', '/*');
            }

            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Tag.destroy({...frame.options, require: true});
        }
    }
};

module.exports = controller;
