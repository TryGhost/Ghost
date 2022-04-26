const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const allowedIncludes = ['count.posts', 'count.members'];

const messages = {
    newsletterNotFound: 'Newsletter not found.'
};
const newslettersService = require('../../services/newsletters');

module.exports = {
    docName: 'newsletters',

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
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Newsletter.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include',
            'fields',
            'debug',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
        ],
        data: [
            'id',
            'slug',
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        async query(frame) {
            const newsletter = models.Newsletter.findOne(frame.data, frame.options);

            if (!newsletter) {
                throw new errors.NotFoundError({
                    message: tpl(messages.newsletterNotFound)
                });
            }
            return newsletter;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'include',
            'opt_in_existing'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        async query(frame) {
            return newslettersService.add(frame.data.newsletters[0], frame.options);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id',
            'include'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        async query(frame) {
            return newslettersService.edit(frame.data.newsletters[0], frame.options);
        }
    },

    verifyPropertyUpdate: {
        permissions: {
            method: 'edit'
        },
        data: [
            'token'
        ],
        async query(frame) {
            return newslettersService.verifyPropertyUpdate(frame.data.token);
        }
    }
};
