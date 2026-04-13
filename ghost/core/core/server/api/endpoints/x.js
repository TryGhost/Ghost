const errors = require('@tryghost/errors');
const models = require('../../models');
const settingsService = require('../../services/settings/settings-service');
const xService = require('../../services/x');
const urlUtils = require('../../../shared/url-utils');
const settingsBREADService = settingsService.getSettingsBREADServiceInstance();

function getRedirectUrl(errorMessage) {
    const adminUrl = new URL(urlUtils.urlFor('admin', true));
    adminUrl.hash = `/settings/integrations/x${errorMessage ? `?error=${encodeURIComponent(errorMessage)}` : ''}`;
    return adminUrl.href;
}

function clearSession(session) {
    if (!session) {
        return;
    }

    delete session.x_oauth_token;
    delete session.x_oauth_token_secret;
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'x',
    auth: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query(frame) {
            frame.response = async function (req, res) {
                try {
                    const authorizationUrl = await xService.getAuthorizationUrl((key, value) => {
                        req.session[key] = value;
                    });

                    return res.redirect(authorizationUrl);
                } catch (error) {
                    clearSession(req.session);
                    return res.redirect(getRedirectUrl(error.message));
                }
            };
        }
    },
    verify: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'edit'
        },
        data: ['oauthVerifier'],
        async query(frame) {
            const oauthVerifier = frame.data.oauthVerifier?.trim();

            if (!oauthVerifier) {
                throw new errors.ValidationError({
                    message: 'Please enter the verification code from X.'
                });
            }

            const session = frame.original.session;
            const accessTokenData = await xService.getAccessTokenData({
                oauthVerifier,
                getSessionProp: key => session[key]
            });

            clearSession(session);

            await models.Settings.edit([{
                key: 'x_access_token',
                value: accessTokenData.oauth_token
            }, {
                key: 'x_access_token_secret',
                value: accessTokenData.oauth_token_secret
            }, {
                key: 'x_user_id',
                value: accessTokenData.user_id
            }, {
                key: 'x_username',
                value: accessTokenData.screen_name ? `@${accessTokenData.screen_name}` : null
            }], frame.options);

            return settingsBREADService.browse(frame.options.context);
        }
    },
    disconnect: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            await models.Settings.edit([{
                key: 'x_access_token',
                value: null
            }, {
                key: 'x_access_token_secret',
                value: null
            }, {
                key: 'x_user_id',
                value: null
            }, {
                key: 'x_username',
                value: null
            }], frame.options);
        }
    }
};

module.exports = controller;
