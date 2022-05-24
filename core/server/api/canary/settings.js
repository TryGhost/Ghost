const Promise = require('bluebird');
const _ = require('lodash');
const models = require('../../models');
const routeSettings = require('../../services/route-settings');
const tpl = require('@tryghost/tpl');
const {BadRequestError} = require('@tryghost/errors');
const settingsService = require('../../services/settings/settings-service');
const membersService = require('../../services/members');
const stripeService = require('../../services/stripe');

const settingsBREADService = settingsService.getSettingsBREADServiceInstance();

const messages = {
    failedSendingEmail: 'Failed Sending Email'

};

async function getStripeConnectData(frame) {
    const stripeConnectIntegrationToken = frame.data.settings.find(setting => setting.key === 'stripe_connect_integration_token');

    if (stripeConnectIntegrationToken && stripeConnectIntegrationToken.value) {
        const getSessionProp = prop => frame.original.session[prop];

        return await settingsBREADService.getStripeConnectData(
            stripeConnectIntegrationToken,
            getSessionProp,
            membersService.stripeConnect.getStripeConnectTokenData
        );
    }
}

module.exports = {
    docName: 'settings',

    browse: {
        options: ['group'],
        permissions: true,
        query(frame) {
            return settingsBREADService.browse(frame.options.context);
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
                    values: ['supportaddressupdate']
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
        statusCode: 204,
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
                    message: tpl(messages.failedSendingEmail)
                });
            }
        }
    },

    disconnectStripeConnectIntegration: {
        statusCode: 204,
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const paidMembers = await membersService.api.memberBREADService.browse({limit: 0, filter: 'status:paid'});
            if (_.get(paidMembers, 'meta.pagination.total') !== 0) {
                throw new BadRequestError({
                    message: 'Cannot disconnect Stripe whilst you have active subscriptions.'
                });
            }

            await stripeService.disconnect();

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
            }, {
                key: 'members_stripe_webhook_id',
                value: null
            }, {
                key: 'members_stripe_webhook_secret',
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
            }
        },
        async query(frame) {
            let stripeConnectData = await getStripeConnectData(frame);

            let result = await settingsBREADService.edit(frame.data.settings, frame.options, stripeConnectData);

            if (_.isEmpty(result)) {
                this.headers.cacheInvalidate = false;
            } else {
                this.headers.cacheInvalidate = true;
            }

            // We need to return all settings here, because we have calculated settings that might change
            const browse = await settingsBREADService.browse(frame.options.context);
            return browse;
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
            await routeSettings.api.setFromFilePath(frame.file.path);
            const getRoutesHash = () => routeSettings.api.getCurrentHash();
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
            return routeSettings.api.get();
        }
    }
};
