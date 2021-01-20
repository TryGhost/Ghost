const Promise = require('bluebird');
const _ = require('lodash');
const validator = require('validator');
const models = require('../../models');
const frontendRouting = require('../../../frontend/services/routing');
const frontendSettings = require('../../../frontend/services/settings');
const {i18n} = require('../../lib/common');
const {BadRequestError, NoPermissionError, NotFoundError} = require('@tryghost/errors');
const settingsService = require('../../services/settings');
const settingsCache = require('../../services/settings/cache');
const membersService = require('../../services/members');

module.exports = {
    docName: 'settings',

    browse: {
        options: ['type', 'group'],
        permissions: true,
        query(frame) {
            let settings = settingsCache.getAll();

            // CASE: no context passed (functional call)
            if (!frame.options.context) {
                return Promise.resolve(settings.filter((setting) => {
                    return setting.group === 'site';
                }));
            }

            // CASE: omit core settings unless internal request
            if (!frame.options.context.internal) {
                settings = _.filter(settings, (setting) => {
                    const isCore = setting.group === 'core';
                    return !isCore;
                });
            }

            return settings;
        }
    },

    read: {
        options: ['key'],
        validation: {
            options: {
                key: {
                    required: true
                }
            }
        },
        permissions: {
            identifier(frame) {
                return frame.options.key;
            }
        },
        query(frame) {
            let setting = settingsCache.get(frame.options.key, {resolve: false});

            if (!setting) {
                return Promise.reject(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: frame.options.key
                    })
                }));
            }

            // @TODO: handle in settings model permissible fn
            if (setting.group === 'core' && !(frame.options.context && frame.options.context.internal)) {
                return Promise.reject(new NoPermissionError({
                    message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                }));
            }

            return {
                [frame.options.key]: setting
            };
        }
    },

    validateMembersEmailUpdate: {
        options: [
            'token',
            'action'
        ],
        permissions: false,
        validation: {
            options: {
                token: {
                    required: true
                },
                action: {
                    values: ['fromaddressupdate', 'supportaddressupdate']
                }
            }
        },
        async query(frame) {
            // This is something you have to do if you want to use the "framework" with access to the raw req/res
            frame.response = async function (req, res) {
                try {
                    const {token, action} = frame.options;
                    const updatedEmailAddress = await membersService.settings.getEmailFromToken({token});
                    const actionToKeyMapping = {
                        fromAddressUpdate: 'members_from_address',
                        supportAddressUpdate: 'members_support_address'
                    };
                    if (updatedEmailAddress) {
                        return models.Settings.edit({
                            key: actionToKeyMapping[action],
                            value: updatedEmailAddress
                        }).then(() => {
                            // Redirect to Ghost-Admin settings page
                            const adminLink = membersService.settings.getAdminRedirectLink({type: action});
                            res.redirect(adminLink);
                        });
                    } else {
                        return Promise.reject(new BadRequestError({
                            message: 'Invalid token!'
                        }));
                    }
                } catch (err) {
                    return Promise.reject(new BadRequestError({
                        err,
                        message: 'Invalid token!'
                    }));
                }
            };
        }
    },

    updateMembersEmail: {
        permissions: {
            method: 'edit'
        },
        data: [
            'email',
            'type'
        ],
        async query(frame) {
            const {email, type} = frame.data;
            if (typeof email !== 'string' || !validator.isEmail(email)) {
                throw new BadRequestError({
                    message: i18n.t('errors.api.settings.invalidEmailReceived')
                });
            }

            if (!type || !['fromAddressUpdate', 'supportAddressUpdate'].includes(type)) {
                throw new BadRequestError({
                    message: 'Invalid email type recieved'
                });
            }
            try {
                // Send magic link to update fromAddress
                await membersService.settings.sendEmailAddressUpdateMagicLink({
                    email,
                    type
                });
            } catch (err) {
                throw new BadRequestError({
                    err,
                    message: i18n.t('errors.mail.failedSendingEmail.error')
                });
            }
        }
    },

    disconnectStripeConnectIntegration: {
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const hasActiveStripeSubscriptions = await membersService.api.hasActiveStripeSubscriptions();
            if (hasActiveStripeSubscriptions) {
                throw new BadRequestError({
                    message: 'Cannot disconnect Stripe whilst you have active subscriptions.'
                });
            }

            return models.Settings.edit([{
                key: 'stripe_connect_publishable_key',
                value: null
            }, {
                key: 'stripe_connect_secret_key',
                value: null
            }, {
                key: 'stripe_connect_livemode',
                value: null
            }, {
                key: 'stripe_connect_display_name',
                value: null
            }, {
                key: 'stripe_connect_account_id',
                value: null
            }], frame.options);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            unsafeAttrsObject(frame) {
                return _.find(frame.data.settings, {key: 'labs'});
            },
            async before(frame) {
                if (frame.options.context && frame.options.context.internal) {
                    return;
                }

                const firstCoreSetting = frame.data.settings.find(setting => setting.group === 'core');
                if (firstCoreSetting) {
                    throw new NoPermissionError({
                        message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    });
                }
            }
        },
        async query(frame) {
            const stripeConnectIntegrationToken = frame.data.settings.find(setting => setting.key === 'stripe_connect_integration_token');

            // The `stripe_connect_integration_token` "setting" is only used to set the `stripe_connect_*` settings.
            const settings = frame.data.settings.filter((setting) => {
                return ![
                    'stripe_connect_integration_token',
                    'stripe_connect_publishable_key',
                    'stripe_connect_secret_key',
                    'stripe_connect_livemode',
                    'stripe_connect_account_id',
                    'stripe_connect_display_name'
                ].includes(setting.key);
            });

            const getSetting = setting => settingsCache.get(setting.key, {resolve: false});

            const firstUnknownSetting = settings.find(setting => !getSetting(setting));

            if (firstUnknownSetting) {
                throw new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: firstUnknownSetting.key
                    })
                });
            }

            if (!(frame.options.context && frame.options.context.internal)) {
                const firstCoreSetting = settings.find(setting => getSetting(setting).group === 'core');
                if (firstCoreSetting) {
                    throw new NoPermissionError({
                        message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    });
                }
            }

            if (stripeConnectIntegrationToken && stripeConnectIntegrationToken.value) {
                const getSessionProp = prop => frame.original.session[prop];
                try {
                    const data = await membersService.stripeConnect.getStripeConnectTokenData(stripeConnectIntegrationToken.value, getSessionProp);
                    settings.push({
                        key: 'stripe_connect_publishable_key',
                        value: data.public_key
                    });
                    settings.push({
                        key: 'stripe_connect_secret_key',
                        value: data.secret_key
                    });
                    settings.push({
                        key: 'stripe_connect_livemode',
                        value: data.livemode
                    });
                    settings.push({
                        key: 'stripe_connect_display_name',
                        value: data.display_name
                    });
                    settings.push({
                        key: 'stripe_connect_account_id',
                        value: data.account_id
                    });
                } catch (err) {
                    throw new BadRequestError({
                        err,
                        message: 'The Stripe Connect token could not be parsed.'
                    });
                }
            }

            return models.Settings.edit(settings, frame.options);
        }
    },

    upload: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            await frontendRouting.settings.setFromFilePath(frame.file.path);
            const getRoutesHash = () => frontendSettings.getCurrentHash('routes');
            await settingsService.syncRoutesHash(getRoutesHash);
        }
    },

    download: {
        headers: {
            disposition: {
                type: 'yaml',
                value: 'routes.yaml'
            }
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        query() {
            return frontendRouting.settings.get();
        }
    }
};
