const Promise = require('bluebird'),
    {omit, merge} = require('lodash'),
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
    allowedIncludes = ['created_by', 'updated_by'];

const invites = {
    browse: (options) => {
        let tasks;

        function modelQuery(options) {
            return models.Invite.findPage(options);
        }

        tasks = [
            localUtils.validate(docName, {opts: localUtils.browseDefaultOptions}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePublicPermissions(docName, 'browse'),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    read: (options) => {
        const attrs = ['id', 'email'];
        let tasks;

        function modelQuery(options) {
            return models.Invite.findOne(options.data, omit(options, ['data']))
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
            localUtils.validate(docName, {attrs: attrs}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePublicPermissions(docName, 'read'),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    destroy: (options) => {
        let tasks;

        function modelQuery(options) {
            return models.Invite.findOne({id: options.id}, omit(options, ['data']))
                .then((invite) => {
                    if (!invite) {
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteNotFound')});
                    }

                    return invite.destroy(options).return(null);
                });
        }

        tasks = [
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePermissions(docName, 'destroy'),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    add: (object, options) => {
        let loggedInUser = options.context.user,
            tasks,
            emailData,
            invite;

        function addInvite(options) {
            const data = options.data;

            return models.Invite.add(data.invites[0], omit(options, 'data'))
                .then((_invite) => {
                    invite = _invite;

                    return settingsAPI.read({key: 'title'});
                })
                .then((response) => {
                    const adminUrl = urlService.utils.urlFor('admin', true);

                    emailData = {
                        blogName: response.settings[0].value,
                        invitedByName: loggedInUser.get('name'),
                        invitedByEmail: loggedInUser.get('email'),
                        // @TODO: resetLink sounds weird
                        resetLink: urlService.utils.urlJoin(adminUrl, 'signup', security.url.encodeBase64(invite.get('token')), '/')
                    };

                    return mail.utils.generateContent({data: emailData, template: 'invite-user'});
                }).then((emailContent) => {
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

                    return mailAPI.send(payload, {context: {internal: true}});
                }).then(() => {
                    options.id = invite.id;
                    return models.Invite.edit({status: 'sent'}, options);
                }).then(() => {
                    invite.set('status', 'sent');
                    const inviteAsJSON = invite.toJSON();

                    return {
                        invites: [inviteAsJSON]
                    };
                }).catch((error) => {
                    if (error && error.errorType === 'EmailError') {
                        const errorMessage = common.i18n.t('errors.api.invites.errorSendingEmail.error', {
                            message: error.message
                        });
                        const helpText = common.i18n.t('errors.api.invites.errorSendingEmail.help');
                        error.message = `${errorMessage} ${helpText}`;
                        common.logging.warn(error.message);
                    }

                    return Promise.reject(error);
                });
        }

        function destroyOldInvite(options) {
            const data = options.data;

            return models.Invite.findOne({email: data.invites[0].email}, omit(options, 'data'))
                .then((invite) => {
                    if (!invite) {
                        return Promise.resolve(options);
                    }

                    return invite.destroy(options);
                })
                .then(() => {
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
            return models.Role.findOne({id: options.data.invites[0].role_id}).then((roleToInvite) => {
                if (!roleToInvite) {
                    return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.roleNotFound')}));
                }

                if (roleToInvite.get('name') === 'Owner') {
                    return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.api.invites.notAllowedToInviteOwner')}));
                }

                const loggedInUserRole = loggedInUser.related('roles').models[0].get('name');
                let allowed = [];

                if (loggedInUserRole === 'Owner' || loggedInUserRole === 'Administrator') {
                    allowed = ['Administrator', 'Editor', 'Author', 'Contributor'];
                } else if (loggedInUserRole === 'Editor') {
                    allowed = ['Author', 'Contributor'];
                }

                if (allowed.indexOf(roleToInvite.get('name')) === -1) {
                    return Promise.reject(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.api.invites.notAllowedToInvite')
                    }));
                }
            }).then(() => {
                return options; 
            });
        }

        function checkIfUserExists(options) {
            return models.User.findOne({email: options.data.invites[0].email}, options)
                .then((user) => {
                    if (user) {
                        return Promise.reject(new common.errors.ValidationError({
                            message: common.i18n.t('errors.api.users.userAlreadyRegistered')
                        }));
                    }

                    return options;
                });
        }

        function fetchLoggedInUser(options) {
            return models.User.findOne({id: loggedInUser}, merge({}, omit(options, 'data'), {withRelated: ['roles']}))
                .then((user) => {
                    if (!user) {
                        return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.users.userNotFound')}));
                    }

                    loggedInUser = user;
                    return options;
                });
        }

        tasks = [
            localUtils.validate(docName, {opts: ['email']}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePermissions(docName, 'add'),
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
