const _ = require('lodash');
const models = require('../../models');
const routeSettings = require('../../services/route-settings');
const {BadRequestError} = require('@tryghost/errors');
const settingsService = require('../../services/settings/settings-service');
const membersService = require('../../services/members');
const stripeService = require('../../services/stripe');
const settingsBREADService = settingsService.getSettingsBREADServiceInstance();

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

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'settings',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: ['group'],
        permissions: true,
        query(frame) {
            return settingsBREADService.browse(frame.options.context);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
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

    verifyKeyUpdate: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            method: 'edit'
        },
        data: [
            'token'
        ],
        async query(frame) {
            await settingsBREADService.verifyKeyUpdate(frame.data.token);

            // We need to return all settings here, because we have calculated settings that might change
            const browse = await settingsBREADService.browse(frame.options.context);

            return browse;
        }
    },

    disconnectStripeConnectIntegration: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
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
            cacheInvalidate: false
        },
        permissions: {
            unsafeAttrsObject(frame) {
                return _.find(frame.data.settings, {key: 'labs'});
            }
        },
        async query(frame) {
            let stripeConnectData = await getStripeConnectData(frame);

            let result = await settingsBREADService.edit(frame.data.settings, frame.options, stripeConnectData);

            if (!_.isEmpty(result)) {
                frame.setHeader('X-Cache-Invalidate', '/*');
            }

            // We need to return all settings here, because we have calculated settings that might change
            const browse = await settingsBREADService.browse(frame.options.context);
            browse.meta = result.meta || {};

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
            },
            cacheInvalidate: false
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

module.exports = controller;
