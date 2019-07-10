const _ = require('lodash');
const security = require('../../lib/security');
const constants = require('../../lib/constants');
const common = require('../../lib/common');
const models = require('../../models');

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

module.exports = {
    generateToken: generateToken
};
