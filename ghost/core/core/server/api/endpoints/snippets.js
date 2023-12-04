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
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'order',
            'page',
            'formats',
            'filter'
        ],
        permissions: true,
        validation: {
            options: {
                formats: {
                    values: models.Snippet.allowedFormats
                }
            }
        },
        query(frame) {
            return models.Snippet.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'formats'
        ],
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
        headers: {
            cacheInvalidate: false
        },
        options: [
            'formats'
        ],
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
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'formats'
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
        headers: {
            cacheInvalidate: false
        },
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
            return models.Snippet.destroy({...frame.options, require: true});
        }
    }
};
