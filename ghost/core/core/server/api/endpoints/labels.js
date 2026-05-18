const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const messages = {
    labelNotFound: 'Label not found.',
    labelAlreadyExists: 'Label already exists'
};

const errorCodes = {
    labelAlreadyExists: 'LABEL_ALREADY_EXISTS'
};

const normalizeDuplicateLabelError = (error) => {
    if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
        throw new errors.ValidationError({
            message: tpl(messages.labelAlreadyExists),
            code: errorCodes.labelAlreadyExists
        });
    }

    throw error;
};

const ALLOWED_INCLUDES = ['count.members'];

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'labels',

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
            'page'
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
            return models.Label.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields'
        ],
        data: [
            'id',
            'slug'
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
            const model = await models.Label.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.labelNotFound)
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
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
            return models.Label.add(frame.data.labels[0], frame.options)
                .catch(normalizeDuplicateLabelError);
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
            const model = await models.Label.edit(frame.data.labels[0], frame.options)
                .catch(normalizeDuplicateLabelError);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.labelNotFound)
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
            return models.Label.destroy({...frame.options, require: true});
        }
    }
};

module.exports = controller;
