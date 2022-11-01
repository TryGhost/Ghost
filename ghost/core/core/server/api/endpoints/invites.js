const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const invites = require('../../services/invites');
const models = require('../../models');
const api = require('./index');
const ALLOWED_INCLUDES = [];
const UNSAFE_ATTRS = ['role_id'];

const messages = {
    inviteNotFound: 'Invite not found.'
};

module.exports = {
    docName: 'invites',

    browse: {
        headers: {
            cacheInvalidate: false
        },
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
            return models.Invite.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
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
            return models.Invite.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.inviteNotFound)
                        }));
                    }

                    return model;
                });
        }
    },

    destroy: {
        headers: {
            cacheInvalidate: false
        },
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
            return models.Invite.destroy({...frame.options, require: true});
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'email'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            },
            data: {
                role_id: {
                    required: true
                },
                email: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return invites.add({
                api,
                InviteModel: models.Invite,
                invites: frame.data.invites,
                options: frame.options,
                user: {
                    name: frame.user?.get('name'),
                    email: frame.user?.get('email')
                }
            });
        }
    }
};
