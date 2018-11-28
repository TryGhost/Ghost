const MembersApi = require('../../lib/members');
const models = require('../../models');

function createMember(email, password) {
    return models.Member.add({email, password: {
        secret: password
    }}, {});
}

const api = MembersApi({
    createMember
});

module.exports = api;
