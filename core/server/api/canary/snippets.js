const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');

const messages = {
    snippetNotFound: 'Snippet not found.',
    snippetAlreadyExists: 'Snippet already exists.'
};

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
                            message: tpl(messages.snippetNotFound)
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
        query(frame) {
            return models.Snippet.add(frame.data.snippets[0], frame.options)
                .catch((error) => {
                    if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                        throw new errors.ValidationError({message: tpl(messages.snippetAlreadyExists)});
                    }

                    throw error;
                });
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
                            message: tpl(messages.snippetNotFound)
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
            frame.options.require = true;

            return models.Snippet.destroy(frame.options)
                .then(() => null)
                .catch(models.Snippet.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.snippetNotFound)
                    }));
                });
        }
    }
};
