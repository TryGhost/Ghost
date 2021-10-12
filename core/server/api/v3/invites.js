const Promise = require('bluebird');
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

            return models.Invite.destroy(frame.options)
                .then(() => null)
                .catch(models.Invite.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.inviteNotFound)
                    }));
                });
        }
    },

    add: {
        statusCode: 201,
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
                    name: frame.user.get('name'),
                    email: frame.user.get('email')
                }
            });
        }
    }
};
