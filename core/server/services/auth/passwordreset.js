const _ = require('lodash');
const security = require('@tryghost/security');
const constants = require('@tryghost/constants');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const mail = require('../mail');

const tokenSecurity = {};

function generateToken(email, settingsAPI) {
    const options = {context: {internal: true}};
    let dbHash;
    let token;

    return settingsAPI.read(_.merge({key: 'db_hash'}, options))
        .then((response) => {
            dbHash = response.settings[0].value;

            return models.User.getByEmail(email, options);
        })
        .then((user) => {
            if (!user) {
                throw new errors.NotFoundError({message: i18n.t('errors.api.users.userNotFound')});
            }

            token = security.tokens.resetToken.generateHash({
                expires: Date.now() + constants.ONE_DAY_MS,
                email: email,
                dbHash: dbHash,
                password: user.get('password')
            });

            return {
                email: email,
                resetToken: token
            };
        });
}

function extractTokenParts(options) {
    options.data.passwordreset[0].token = security.url.decodeBase64(options.data.passwordreset[0].token);

    const tokenParts = security.tokens.resetToken.extract({
        token: options.data.passwordreset[0].token
    });

    if (!tokenParts) {
        return Promise.reject(new errors.UnauthorizedError({
            message: i18n.t('errors.api.passwordReset.corruptedToken.message'),
            context: i18n.t('errors.api.passwordReset.corruptedToken.context'),
            help: i18n.t('errors.api.passwordReset.corruptedToken.help')
        }));
    }

    return Promise.resolve({options, tokenParts});
}

// @TODO: use brute force middleware (see https://github.com/TryGhost/Ghost/pull/7579)
function protectBruteForce({options, tokenParts}) {
    if (tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`] &&
        tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`].count >= 10) {
        return Promise.reject(new errors.NoPermissionError({
            message: i18n.t('errors.models.user.tokenLocked')
        }));
    }

    return Promise.resolve({options, tokenParts});
}

function doReset(options, tokenParts, settingsAPI) {
    let dbHash;

    const data = options.data.passwordreset[0];
    const resetToken = data.token;
    const oldPassword = data.oldPassword;
    const newPassword = data.newPassword;

    return settingsAPI.read(_.merge({key: 'db_hash'}, _.omit(options, 'data')))
        .then((response) => {
            dbHash = response.settings[0].value;

            return models.User.getByEmail(tokenParts.email, options);
        })
        .then((user) => {
            if (!user) {
                throw new errors.NotFoundError({message: i18n.t('errors.api.users.userNotFound')});
            }

            let compareResult = security.tokens.resetToken.compare({
                token: resetToken,
                dbHash: dbHash,
                password: user.get('password')
            });

            if (!compareResult.correct) {
                let error;
                if (compareResult.reason === 'expired' || compareResult.reason === 'invalid_expiry') {
                    error = new errors.BadRequestError({
                        message: i18n.t('errors.api.passwordReset.expired.message'),
                        context: i18n.t('errors.api.passwordReset.expired.context'),
                        help: i18n.t('errors.api.passwordReset.expired.help')
                    });
                } else {
                    error = new errors.BadRequestError({
                        message: i18n.t('errors.api.passwordReset.invalidToken.message'),
                        context: i18n.t('errors.api.passwordReset.invalidToken.context'),
                        help: i18n.t('errors.api.passwordReset.invalidToken.help')
                    });
                }

                return Promise.reject(error);
            }

            return models.User.changePassword({
                oldPassword: oldPassword,
                newPassword: newPassword,
                user_id: user.id
            }, options);
        })
        .then((updatedUser) => {
            updatedUser.set('status', 'active');
            return updatedUser.save(options);
        })
        .catch(errors.ValidationError, (err) => {
            return Promise.reject(err);
        })
        .catch((err) => {
            if (errors.utils.isIgnitionError(err)) {
                return Promise.reject(err);
            }
            return Promise.reject(new errors.UnauthorizedError({err: err}));
        });
}

async function sendResetNotification(data, mailAPI) {
    const adminUrl = urlUtils.urlFor('admin', true);
    const resetToken = security.url.encodeBase64(data.resetToken);
    const resetUrl = urlUtils.urlJoin(adminUrl, 'reset', resetToken, '/');

    const content = await mail.utils.generateContent({
        data: {
            resetUrl
        },
        template: 'reset-password'
    });

    const payload = {
        mail: [{
            message: {
                to: data.email,
                subject: i18n.t('common.api.authentication.mail.resetPassword'),
                html: content.html,
                text: content.text
            },
            options: {}
        }]
    };

    return mailAPI.send(payload, {context: {internal: true}});
}

module.exports = {
    generateToken,
    extractTokenParts,
    protectBruteForce,
    doReset,
    sendResetNotification
};
