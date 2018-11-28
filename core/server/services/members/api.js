const MembersApi = require('../../lib/members');

const emailIdx = {
    'member@member.com': 'id-0'
};

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

function validateMember({email, password}) {
    const id = emailIdx[email];
    if (!id) {
        return Promise.reject('Incorrect email');
    }
    if (db[id].password !== password) {
        return Promise.reject('Incorrect password');
    }
    return Promise.resolve(db[id]);
}

const api = MembersApi({createMember, validateMember});

module.exports = api;
