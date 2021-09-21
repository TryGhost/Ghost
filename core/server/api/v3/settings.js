const Promise = require('bluebird');
const _ = require('lodash');
const models = require('../../models');
const routeSettings = require('../../services/route-settings');
const frontendSettings = require('../../../frontend/services/settings');
const i18n = require('../../../shared/i18n');
const {BadRequestError, NoPermissionError} = require('@tryghost/errors');
const settingsService = require('../../services/settings');
const settingsCache = require('../../../shared/settings-cache');
const membersService = require('../../services/members');

const settingsBREADService = settingsService.getSettingsBREADServiceInstance();

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

            if (!frame.options.context.internal) {
                // CASE: omit core settings unless internal request
                settings = _.filter(settings, (setting) => {
                    const isCore = setting.group === 'core';
                    return !isCore;
                });
                // CASE: omit secret settings unless internal request
                settings = settings.map(settingsService.hideValueIfSecret);
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
            return settingsBREADService.read(frame.options.key, frame.options.context);
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
            let stripeConnectData;
            const stripeConnectIntegrationToken = frame.data.settings.find(setting => setting.key === 'stripe_connect_integration_token');

            if (stripeConnectIntegrationToken && stripeConnectIntegrationToken.value) {
                const getSessionProp = prop => frame.original.session[prop];

                stripeConnectData = await settingsBREADService.getStripeConnectData(
                    stripeConnectIntegrationToken,
                    getSessionProp,
                    membersService.stripeConnect.getStripeConnectTokenData
                );
            }

            return await settingsBREADService.edit(frame.data.settings, frame.options, stripeConnectData);
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
            await routeSettings.setFromFilePath(frame.file.path);
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
            return routeSettings.get();
        }
    }
};
