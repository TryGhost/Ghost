const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const permissionsService = require('../../services/permissions');
const ALLOWED_INCLUDES = ['count.posts', 'permissions', 'roles', 'roles.permissions'];
const UNSAFE_ATTRS = ['status', 'roles'];

const messages = {
    userNotFound: 'User not found.'
};

module.exports = {
    docName: 'users',

    browse: {
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
            return models.User.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include',
            'filter',
            'fields',
            'debug'
        ],
        data: [
            'id',
            'slug',
            'email',
            'role'
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
            return models.User.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.userNotFound)
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
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return models.User.edit(frame.data.users[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.userNotFound)
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
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Base.transaction((t) => {
                frame.options.transacting = t;

                return Promise.all([
                    models.Post.destroyByAuthor(frame.options)
                ]).then(() => {
                    return models.User.destroy(Object.assign({status: 'all'}, frame.options));
                }).then(() => null);
            }).catch((err) => {
                return Promise.reject(new errors.NoPermissionError({
                    err: err
                }));
            });
        }
    },

    changePassword: {
        validation: {
            docName: 'password',
            data: {
                newPassword: {required: true},
                ne2Password: {required: true},
                user_id: {required: true}
            }
        },
        permissions: {
            docName: 'user',
            method: 'edit',
            identifier(frame) {
                return frame.data.password[0].user_id;
            }
        },
        query(frame) {
            frame.options.skipSessionID = frame.original.session.id;
            return models.User.changePassword(frame.data.password[0], frame.options);
        }
    },

    transferOwnership: {
        permissions(frame) {
            return models.Role.findOne({name: 'Owner'})
                .then((ownerRole) => {
                    return permissionsService.canThis(frame.options.context).assign.role(ownerRole);
                });
        },
        query(frame) {
            return models.User.transferOwnership(frame.data.owner[0], frame.options);
        }
    }
};
