const url = require('url');
const settingsCache = require('../settings/cache');
const config = require('../../config');
const MembersApi = require('../../lib/members');
const models = require('../../models');
const mail = require('../mail');

function createMember({name, email, password}) {
    return models.Member.add({
        name,
        email,
        password
    }).then((member) => {
        return member.toJSON();
    });
}

function updateMember(member, newData) {
    return models.Member.findOne(member, {
        require: true
    }).then(({id}) => {
        return models.Member.edit(newData, {id});
    }).then((member) => {
        return member.toJSON();
    });
}

function getMember(data, options) {
    options = options || {};
    return models.Member.findOne(data, options).then((model) => {
        if (!model) {
            return null;
        }
        return model.toJSON(options);
    });
}

function listMembers(options) {
    return models.Member.findPage(options).then((models) => {
        return {
            members: models.data.map(model => model.toJSON(options)),
            meta: models.meta
        };
    });
}

function validateMember({email, password}) {
    return models.Member.findOne({email}, {
        require: true
    }).then((member) => {
        return member.comparePassword(password).then((res) => {
            if (!res) {
                throw new Error('Password is incorrect');
            }
            return member;
        });
    }).then((member) => {
        return member.toJSON();
    });
}

// @TODO this should check some config/settings and return Promise.reject by default
function validateAudience({audience, origin}) {
    if (audience === origin) {
        return Promise.resolve();
    }
    return Promise.resolve();
}

const publicKey = settingsCache.get('members_public_key');
const privateKey = settingsCache.get('members_private_key');
const sessionSecret = settingsCache.get('members_session_secret');
const passwordResetUrl = config.get('url');
const {protocol, host} = url.parse(config.get('url'));
const siteOrigin = `${protocol}//${host}`;
const issuer = siteOrigin;
const ssoOrigin = siteOrigin;
let mailer;

const membersConfig = config.get('members');

function sendEmail(member, {token}) {
    if (!(mailer instanceof mail.GhostMailer)) {
        mailer = new mail.GhostMailer();
    }
    const message = {
        to: member.email,
        subject: 'Reset password',
        html: `
        Hi ${member.name},

        To reset your password, click the following link and follow the instructions:

        ${passwordResetUrl}#reset-password?token=${token}

        If you didn't request a password change, just ignore this email.
        `
    };

    /* eslint-disable */
    // @TODO remove this
    console.log(message.html);
    /* eslint-enable */
    return mailer.send(message).catch((err) => {
        return Promise.reject(err);
    });
}

const api = MembersApi({
    authConfig: {
        issuer,
        publicKey,
        privateKey,
        sessionSecret,
        ssoOrigin
    },
    paymentConfig: {
        processors: membersConfig.paymentProcessors
    },
    validateAudience,
    createMember,
    getMember,
    listMembers,
    validateMember,
    updateMember,
    sendEmail
});

module.exports = api;
module.exports.publicKey = publicKey;
module.exports.paymentConfigured = !!membersConfig.paymentProcessors.length;
