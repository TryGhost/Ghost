const MembersApi = require('../../lib/members');

const db = {
    'member@member.com': {
        id: 'id-0',
        email: 'member@member.com',
        name: 'John Member',
        password: 'hunter2'
    }
};

function validateMember({email, password}) {
    if (!db[email]) {
        return Promise.reject('Incorrect email');
    }
    if (db[email].password !== password) {
        return Promise.reject('Incorrect password');
    }
    return Promise.resolve();
}

const api = MembersApi({validateMember});

module.exports = api;
