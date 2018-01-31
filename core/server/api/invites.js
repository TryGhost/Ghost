'use strict';

const _ = require('lodash'),
    pipeline = require('../lib/promise/pipeline'),
    mail = require('../services/mail'),
    urlService = require('../services/url'),
    localUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    security = require('../lib/security'),
    mailAPI = require('./mail'),
    settingsAPI = require('./settings'),
    docName = 'invites',
    unsafeAttrs = ['role_id'],
    allowedIncludes = ['created_by', 'updated_by'];

let invites;

invites = {
    browse: function browse(options) {
        var tasks;

        function modelQuery(options) {
            return models.Invite.findPage(options);
        }

        tasks = [
            localUtils.validate(docName, {opts: localUtils.browseDefaultOptions}),
            localUtils.handlePublicPermissions(docName, 'browse'),
            localUtils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    read: function read(options) {
        var attrs = ['id', 'email'],
            tasks;

        function modelQuery(options) {
            return models.Invite.findOne(options.data, _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.invites.inviteNotFound')
                        });
                    }

                    return {
                        invites: [model.toJSON(options)]
                    };
                });
        }

        tasks = [
            localUtils.validate(docName, {attrs: attrs}),
            localUtils.handlePublicPermissions(docName, 'read'),
            localUtils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    destroy: function destroy(options) {
        var tasks;

        function modelQuery(options) {
            return models.Invite.findOne({id: options.id}, _.omit(options, ['data']))
                .then(function (invite) {
                    if (!invite) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.invites.inviteNotFound')
                        });
                    }

                    return invite.destroy(options).return(null);
                });
        }

        tasks = [
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions}),
            localUtils.handlePermissions(docName, 'destroy'),
            localUtils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    add: function add(object, options) {
        var tasks,
            loggedInUser = options.context.user,
            emailData,
            invite;

        function customValidation(options) {
            if (!options.data.invites[0].email) {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.invites.emailIsRequired')
                });
            }

            if (!options.data.invites[0].role_id) {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.invites.roleIsRequired')
                });
            }

            return options;
        }

        function fetchLoggedInUser(options) {
            return models.User.findOne({id: loggedInUser}, _.merge({}, _.omit(options, 'data'), {include: ['roles']}))
                .then(function (user) {
                    if (!user) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        });
                    }

                    loggedInUser = user;
                    return options;
                });
        }

        function checkIfUserToInviteExists(options) {
            return models.User.findOne({email: options.data.invites[0].email}, options)
                .then(function (user) {
                    if (user) {
                        throw new common.errors.ValidationError({
                            message: common.i18n.t('errors.api.users.userAlreadyRegistered')
                        });
                    }

                    return options;
                });
        }

        function destroyOldInvite(options) {
            var data = options.data;

            return models.Invite.findOne({email: data.invites[0].email}, _.omit(options, 'data'))
                .then(function (invite) {
                    if (!invite) {
                        return options;
                    }

                    return invite.destroy(options);
                })
                .then(function () {
                    return options;
                });
        }

        function addInvite(options) {
            var data = options.data;

            return models.Invite.add(data.invites[0], _.omit(options, 'data'))
                .then(function (_invite) {
                    invite = _invite;

                    return settingsAPI.read({key: 'title'});
                })
                .then(function (response) {
                    var adminUrl = urlService.utils.urlFor('admin', true);

                    emailData = {
                        blogName: response.settings[0].value,
                        invitedByName: loggedInUser.get('name'),
                        invitedByEmail: loggedInUser.get('email'),
                        // @TODO: resetLink sounds weird
                        resetLink: urlService.utils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/')
                    };

                    return mail.utils.generateContent({data: emailData, template: 'invite-user'});
                }).then(function (emailContent) {
                    var payload = {
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

                    return mailAPI.send(payload, {context: {internal: true}});
                }).then(function () {
                    options.id = invite.id;
                    return models.Invite.edit({status: 'sent'}, options);
                }).then(function () {
                    invite.set('status', 'sent');
                    var inviteAsJSON = invite.toJSON();

                    return {
                        invites: [inviteAsJSON]
                    };
                }).catch(function (error) {
                    if (error && error.errorType === 'EmailError') {
                        error.message = common.i18n.t('errors.api.invites.errorSendingEmail.error', {message: error.message}) + ' ' +
                            common.i18n.t('errors.api.invites.errorSendingEmail.help');
                        common.logging.warn(error.message);
                    }

                    throw error;
                });
        }

        tasks = [
            localUtils.validate(docName, {opts: ['email']}),
            customValidation,
            localUtils.handlePermissions(docName, 'add', unsafeAttrs),
            localUtils.convertOptions(allowedIncludes),
            fetchLoggedInUser,
            checkIfUserToInviteExists,
            destroyOldInvite,
            addInvite
        ];

        return pipeline(tasks, object, options);
    }
};

module.exports = invites;
