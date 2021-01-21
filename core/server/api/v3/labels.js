const Promise = require('bluebird');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const models = require('../../models');

const ALLOWED_INCLUDES = ['count.members'];

module.exports = {
    docName: 'labels',

    browse: {
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
        query(frame) {
            return models.Label.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: i18n.t('errors.api.labels.labelNotFound')
                        }));
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        headers: {},
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
        async query(frame) {
            try {
                return await models.Label.add(frame.data.labels[0], frame.options);
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new errors.ValidationError({message: i18n.t('errors.api.labels.labelAlreadyExists')});
                }

                throw error;
            }
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
            return models.Label.edit(frame.data.labels[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: i18n.t('errors.api.labels.labelNotFound')
                        }));
                    }

                    if (model.wasChanged()) {
                        this.headers.cacheInvalidate = true;
                    } else {
                        this.headers.cacheInvalidate = false;
                    }

                    return model;
                });
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
            return models.Label.destroy(frame.options)
                .then(() => null)
                .catch(models.Label.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.labels.labelNotFound')
                    }));
                });
        }
    }
};
