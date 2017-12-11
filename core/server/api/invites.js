var Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../utils/pipeline'),
    mail = require('./../mail'),
    globalUtils = require('../utils'),
    urlService = require('../services/url'),
    apiUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    mailAPI = require('./mail'),
    settingsAPI = require('./settings'),
    docName = 'invites',
    allowedIncludes = ['created_by', 'updated_by'],
    invites;

invites = {
    browse: function browse(options) {
        var tasks;

        function modelQuery(options) {
            return models.Invite.findPage(options);
        }

        tasks = [
            apiUtils.validate(docName, {opts: apiUtils.browseDefaultOptions}),
            apiUtils.handlePublicPermissions(docName, 'browse'),
            apiUtils.convertOptions(allowedIncludes),
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
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.invites.inviteNotFound')
                        }));
                    }

                    return {
                        invites: [model.toJSON(options)]
                    };
                });
        }

        tasks = [
            apiUtils.validate(docName, {attrs: attrs}),
            apiUtils.handlePublicPermissions(docName, 'read'),
            apiUtils.convertOptions(allowedIncludes),
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
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteNotFound')});
                    }

                    return invite.destroy(options).return(null);
                });
        }

        tasks = [
            apiUtils.validate(docName, {opts: apiUtils.idDefaultOptions}),
            apiUtils.handlePermissions(docName, 'destroy'),
            apiUtils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    add: function add(object, options) {
        var tasks,
            loggedInUser = options.context.user,
            emailData,
            invite;

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
                        resetLink: urlService.utils.urlJoin(adminUrl, 'signup', globalUtils.encodeBase64URLsafe(invite.get('token')), '/')
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

                    return Promise.reject(error);
                });
        }

        function destroyOldInvite(options) {
            var data = options.data;

            return models.Invite.findOne({email: data.invites[0].email}, _.omit(options, 'data'))
                .then(function (invite) {
                    if (!invite) {
                        return Promise.resolve(options);
                    }

                    return invite.destroy(options);
                })
                .then(function () {
                    return options;
                });
        }

        function validation(options) {
            if (!options.data.invites[0].email) {
                return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.invites.emailIsRequired')}));
            }

            if (!options.data.invites[0].role_id) {
                return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.invites.roleIsRequired')}));
            }

            // @TODO remove when we have a new permission unit
            // Make sure user is allowed to add a user with this role
            // We cannot use permissible because we don't have access to the role_id!!!
            // Adding a permissible function to the invite model, doesn't give us much context of the invite we would like to add
            // As we are looking forward to replace the permission system completely, we do not add a hack here
            return models.Role.findOne({id: options.data.invites[0].role_id}).then(function (roleToInvite) {
                if (!roleToInvite) {
                    return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.roleNotFound')}));
                }

                if (roleToInvite.get('name') === 'Owner') {
                    return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.api.invites.notAllowedToInviteOwner')}));
                }

                var loggedInUserRole = loggedInUser.related('roles').models[0].get('name'),
                    allowed = [];

                if (loggedInUserRole === 'Owner' || loggedInUserRole === 'Administrator') {
                    allowed = ['Administrator', 'Editor', 'Author'];
                } else if (loggedInUserRole === 'Editor') {
                    allowed = ['Author'];
                }

                if (allowed.indexOf(roleToInvite.get('name')) === -1) {
                    return Promise.reject(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.invites.notAllowedToInvite')
                    }));
                }
            }).then(function () {
                return options;
            });
        }

        function checkIfUserExists(options) {
            return models.User.findOne({email: options.data.invites[0].email}, options)
                .then(function (user) {
                    if (user) {
                        return Promise.reject(new common.errors.ValidationError({
                            message: common.i18n.t('errors.api.users.userAlreadyRegistered')
                        }));
                    }

                    return options;
                });
        }

        function fetchLoggedInUser(options) {
            return models.User.findOne({id: loggedInUser}, _.merge({}, options, {include: ['roles']}))
                .then(function (user) {
                    if (!user) {
                        return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.users.userNotFound')}));
                    }

                    loggedInUser = user;
                    return options;
                });
        }

        tasks = [
            apiUtils.validate(docName, {opts: ['email']}),
            apiUtils.handlePermissions(docName, 'add'),
            apiUtils.convertOptions(allowedIncludes),
            fetchLoggedInUser,
            validation,
            checkIfUserExists,
            destroyOldInvite,
            addInvite
        ];

        return pipeline(tasks, object, options);
    }
};

module.exports = invites;
