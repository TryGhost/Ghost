const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['post', 'member'];
const UNSAFE_ATTRS = ['status'];

const messages = {
    commentNotFound: 'Comment could not be found'
};

module.exports = {
    docName: 'comments',

    browse: {
        options: [
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include'
        ],
        data: [
            'id',
            'email'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.commentNotFound)
                        }));
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {},
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
        query(frame) {
            return models.Comment.edit(frame.data.comments[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.commentNotFound)
                        }));
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        options: [
            'include'

        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            },
            data: {
                member_id: {
                    required: true
                },
                post_id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return models.Comment.add(frame.data.comments[0], frame.options);
        }
    },

    destroy: {
        statusCode: 204,
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            frame.options.require = true;

            return models.Comment.destroy(frame.options)
                .then(() => null)
                .catch(models.Comment.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.commentNotFound)
                    }));
                });
        }
    }
};
