const Promise = require('bluebird');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const models = require('../../models');

module.exports = {
    docName: 'snippets',

    browse: {
        options: [
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        query(frame) {
            return models.Snippet.findPage(frame.options);
        }
    },

    read: {
        headers: {},
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            return models.Snippet.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: i18n.t('errors.api.snippets.snippetNotFound')
                        }));
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        permissions: true,
        async query(frame) {
            try {
                return await models.Snippet.add(frame.data.snippets[0], frame.options);
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new errors.ValidationError({message: i18n.t('errors.api.snippets.snippetAlreadyExists')});
                }

                throw error;
            }
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
        query(frame) {
            return models.Snippet.edit(frame.data.snippets[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: i18n.t('errors.api.snippets.snippetNotFound')
                        }));
                    }

                    return model;
                });
        }
    },

    destroy: {
        statusCode: 204,
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
        query(frame) {
            return models.Snippet.destroy(frame.options)
                .then(() => null)
                .catch(models.Snippet.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.snippets.snippetNotFound')
                    }));
                });
        }
    }
};
