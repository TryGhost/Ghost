const settingsCache = require('../settings/cache');
const config = require('../../config');
const MembersApi = require('../../lib/members');
const models = require('../../models');
const URL = require('url').URL;

function createMember({name, email, password}) {
    return models.Member.add({
        name,
        email,
        password: {
            secret: password
        }
    }, {
        withRelated: ['password']
    }).then((member) => {
        return member.toJSON();
    });
}

function updateMember(member, {name, email, password}) {
    return models.Member.findOne(member, {
        require: true
    }).then(({id}) => {
        return models.Member.edit({
            name,
            email,
            password: {
                secret: password
            }
        }, {
            id,
            withRelated: ['password']
        });
    }).then((member) => {
        return member.toJSON();
    });
}

function getMember(member) {
    return models.Member.findOne(member, {
        require: true
    }).then((member) => {
        return member.toJSON();
    });
}

function validateMember({email, password}) {
    return models.Member.findOne({email}, {
        withRelated: ['password'],
        require: true
    }).then((member) => {
        return member.related('password').compare(password).then((res) => {
            if (!res) {
                throw new Error('Password is incorrect');
            }
            return member;
        });
    }).then((member) => {
        return member.toJSON();
    });
}

function validateAudience({audience, origin}) {
    if (audience === origin) {
        return Promise.resolve();
    }
    return Promise.reject();
}

const publicKey = settingsCache.get('members_public_key');
const privateKey = settingsCache.get('members_private_key');
const sessionSecret = settingsCache.get('members_session_secret');
const passwordResetUrl = config.get('url');
const issuer = config.get('url');
const ssoOrigin = new URL(config.get('url')).origin;

function sendEmail(member, {token}) {
    /* eslint-disable */
    console.log(`
  From: members@ghost.com
  To: ${member.email}

  Subject: ${member.password ? 'Password reset' : 'Confirm email address'}

  Hi ${member.name},

  The link to reset your password is:

      ${passwordResetUrl}#reset-password?token=${token}
`);
    /* eslint-enable */
    return Promise.resolve();
}

const api = MembersApi({
    config: {
        issuer,
        publicKey,
        privateKey,
        sessionSecret,
        ssoOrigin
    },
    validateAudience,
    createMember,
    getMember,
    validateMember,
    updateMember,
    sendEmail
});

module.exports = api;
module.exports.publicKey = publicKey;
