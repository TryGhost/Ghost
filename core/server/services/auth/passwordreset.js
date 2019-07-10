const _ = require('lodash');
const security = require('../../lib/security');
const constants = require('../../lib/constants');
const common = require('../../lib/common');
const models = require('../../models');

const tokenSecurity = {};

function generateToken(email, settingsAPI) {
    const options = {context: {internal: true}};
    let dbHash, token;

    return settingsAPI.read(_.merge({key: 'db_hash'}, options))
        .then((response) => {
            dbHash = response.settings[0].value;

            return models.User.getByEmail(email, options);
        })
        .then((user) => {
            if (!user) {
                throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.users.userNotFound')});
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
        return Promise.reject(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.api.common.invalidTokenStructure')
        }));
    }

    return Promise.resolve({options, tokenParts});
}

// @TODO: use brute force middleware (see https://github.com/TryGhost/Ghost/pull/7579)
function protectBruteForce({options, tokenParts}) {
    if (tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`] &&
        tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`].count >= 10) {
        return Promise.reject(new common.errors.NoPermissionError({
            message: common.i18n.t('errors.models.user.tokenLocked')
        }));
    }

    return Promise.resolve({options, tokenParts});
}

module.exports = {
    generateToken: generateToken,
    extractTokenParts: extractTokenParts,
    protectBruteForce: protectBruteForce
};
