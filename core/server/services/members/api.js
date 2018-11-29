const settingsCache = require('../settings/cache');
const MembersApi = require('../../lib/members');

const emailIdx = {
    'member@member.com': 'id-0'
};

const tokenIdx = {};

const db = {
    'id-0': {
        email: 'member@member.com',
        name: 'John Member',
        password: 'hunter2'
    }
};

function createMember({name, email, password}) {
    if (emailIdx[email]) {
        return Promise.reject(new Error('Email already exists'));
    }
    const id = 'id-' + Object.keys(db).length;
    db[id] = {name, email, password};
    emailIdx[email] = id;
    return Promise.resolve(db[id]);
}

function validateToken({token}) {
    const id = tokenIdx[token];
    if (!id) {
        Promise.reject('Unknown token');
    }
    delete tokenIdx[token];
    return Promise.resolve(db[id]);
}

function validateMember({email, password, token}) {
    if (token) {
        return validateToken({token});
    }
    const id = emailIdx[email];
    if (!id) {
        return Promise.reject('Incorrect email');
    }
    if (db[id].password !== password) {
        return Promise.reject('Incorrect password');
    }
    return Promise.resolve(db[id]);
}

function updateMember({email}, data) {
    const id = emailIdx[email];
    if (!id) {
        return Promise.reject('Could not find user');
    }
    if (data.token) {
        tokenIdx[data.token] = id;
        delete data.token;
    }
    db[id] = Object.assign(db[id], data);
    if (data.email) {
        delete emailIdx[email];
        emailIdx[db[id].email] = id;
    }
    return Promise.resolve(db[id]);
}

function sendEmail(member, {token}) {
    /* eslint-disable */
    console.log(`
  From: members@ghost.com
  To: ${member.email}

  Subject: ${member.password ? 'Password reset' : 'Confirm email address'}

  Hi ${member.name},

  The token is
      ${token}
`);
    /* eslint-enable */
    return Promise.resolve();
}

const publicKey = settingsCache.get('members_public_key');
const privateKey = settingsCache.get('members_private_key');
const sessionSecret = settingsCache.get('members_session_secret');

const api = MembersApi({
    config: {
        publicKey,
        privateKey,
        sessionSecret
    },
    createMember,
    validateMember,
    updateMember,
    sendEmail
});

module.exports = api;
