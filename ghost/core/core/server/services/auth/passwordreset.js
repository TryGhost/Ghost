const _ = require('lodash');
const security = require('@tryghost/security');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const moment = require('moment');

const models = require('../../models');
const ghostBookshelf = require('../../models/base');
const urlUtils = require('../../../shared/url-utils').default;
const mail = require('../mail');

const messages = {
    userNotFound: 'User not found.',
    resetPassword: 'Reset Password',
    expired: {
        message: 'Cannot reset password.',
        context: 'Password reset link expired.',
        help: 'Request a new password reset via the login form.'
    },
    invalidToken: {
        message: 'Cannot reset password.',
        context: 'Password reset link has already been used.',
        help: 'Request a new password reset via the login form.'
    },
    corruptedToken: {
        message: 'Cannot reset password.',
        context: 'Invalid password reset link.',
        help: 'Check if password reset link has been fully copied or request new password reset via the login form.'
    }
};

function generateToken(email, settingsAPI, transaction) {
    const options = {context: {internal: true}, transacting: transaction};
    let dbHash;
    let token;

    return settingsAPI.read(_.merge({key: 'db_hash'}, options))
        .then((response) => {
            dbHash = response.settings[0].value;

            return models.User.getByEmail(email, options);
        })
        .then((user) => {
            if (!user) {
                throw new errors.NotFoundError({message: tpl(messages.userNotFound)});
            }

            token = security.tokens.resetToken.generateHash({
                expires: moment().add(1, 'days').valueOf(),
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
    options.data.password_reset[0].token = security.url.decodeBase64(options.data.password_reset[0].token);

    const tokenParts = security.tokens.resetToken.extract({
        token: options.data.password_reset[0].token
    });

    if (!tokenParts) {
        return Promise.reject(new errors.UnauthorizedError({
            message: tpl(messages.corruptedToken.message),
            context: tpl(messages.corruptedToken.context),
            help: tpl(messages.corruptedToken.help)
        }));
    }

    return Promise.resolve({options, tokenParts});
}

function doReset(options, tokenParts, settingsAPI) {
    const data = options.data.password_reset[0];
    const resetToken = data.token;
    const oldPassword = data.oldPassword;
    const newPassword = data.newPassword;

    return ghostBookshelf.transaction(async (transacting) => {
        const txOptions = {context: options.context, transacting};

        const settingsResponse = await settingsAPI.read({key: 'db_hash', ...txOptions});
        const dbHash = settingsResponse.settings[0].value;

        const candidate = await models.User.getByEmail(tokenParts.email, txOptions);
        if (!candidate) {
            throw new errors.NotFoundError({message: tpl(messages.userNotFound)});
        }

        const user = await new models.User({id: candidate.id})
            .fetch({...txOptions, forUpdate: true, require: true});

        let compareResult = security.tokens.resetToken.compare({
            token: resetToken,
            dbHash: dbHash,
            password: user.get('password')
        });

        if (!compareResult.correct) {
            if (compareResult.reason === 'expired' || compareResult.reason === 'invalid_expiry') {
                throw new errors.BadRequestError({
                    message: tpl(messages.expired.message),
                    context: tpl(messages.expired.context),
                    help: tpl(messages.expired.help)
                });
            } else {
                throw new errors.BadRequestError({
                    message: tpl(messages.invalidToken.message),
                    context: tpl(messages.invalidToken.context),
                    help: tpl(messages.invalidToken.help)
                });
            }
        }

        const updatedUser = await models.User.changePassword({
            oldPassword: oldPassword,
            newPassword: newPassword,
            user_id: user.id
        }, txOptions);

        updatedUser.set('status', 'active');
        const savedUser = await updatedUser.save(null, txOptions);
        return {user: savedUser};
    }).catch((err) => {
        if (errors.utils.isGhostError(err)) {
            return Promise.reject(err);
        }
        return Promise.reject(new errors.UnauthorizedError({err: err}));
    });
}

async function sendResetNotification(data, mailAPI) {
    const adminUrl = urlUtils.urlFor('admin', true);
    const resetToken = security.url.encodeBase64(data.resetToken);
    const resetUrl = urlUtils.urlJoin(adminUrl, 'reset', resetToken, '/');
    const emailData = {
        resetUrl: resetUrl,
        recipientEmail: data.email
    };

    const content = await mail.utils.generateContent({
        data: emailData,
        template: 'reset-password'
    });

    const payload = {
        mail: [{
            message: {
                to: data.email,
                subject: tpl(messages.resetPassword),
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
    doReset,
    sendResetNotification
};
