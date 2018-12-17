const Promise = require('bluebird');
const common = require('../../lib/common');
const security = require('../../lib/security');
const mailService = require('../../services/mail');
const urlService = require('../../services/url');
const settingsCache = require('../../services/settings/cache');
const models = require('../../models');
const api = require('./index');
const ALLOWED_INCLUDES = [];
const UNSAFE_ATTRS = ['role_id'];

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
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.invites.inviteNotFound')
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
                .return(null);
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
            let invite;
            let emailData;

            // CASE: ensure we destroy the invite before
            return models.Invite.findOne({email: frame.data.invites[0].email}, frame.options)
                .then((invite) => {
                    if (!invite) {
                        return;
                    }

                    return invite.destroy(frame.options);
                })
                .then(() => {
                    return models.Invite.add(frame.data.invites[0], frame.options);
                })
                .then((_invite) => {
                    invite = _invite;

                    const adminUrl = urlService.utils.urlFor('admin', true);

                    emailData = {
                        blogName: settingsCache.get('title'),
                        invitedByName: frame.user.get('name'),
                        invitedByEmail: frame.user.get('email'),
                        resetLink: urlService.utils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/')
                    };

                    return mailService.utils.generateContent({data: emailData, template: 'invite-user'});
                })
                .then((emailContent) => {
                    const payload = {
                        mail: [{
                            message: {
                                to: invite.get('email'),
                                subject: common.i18n.t('common.api.users.mail.invitedByName', {
                                    invitedByName: emailData.invitedByName,
                                    blogName: emailData.blogName
                                }),
                                html: emailContent.html,
                                text: emailContent.text
                            },
                            options: {}
                        }]
                    };

                    return api.mail.send(payload, {context: {internal: true}});
                })
                .then(() => {
                    return models.Invite.edit({
                        status: 'sent'
                    }, Object.assign({id: invite.id}, frame.options));
                })
                .then((invite) => {
                    return invite;
                })
                .catch((err) => {
                    if (err && err.errorType === 'EmailError') {
                        const errorMessage = common.i18n.t('errors.api.invites.errorSendingEmail.error', {
                            message: err.message
                        });
                        const helpText = common.i18n.t('errors.api.invites.errorSendingEmail.help');
                        err.message = `${errorMessage} ${helpText}`;
                        common.logging.warn(err.message);
                    }

                    return Promise.reject(err);
                });
        }
    }
};
