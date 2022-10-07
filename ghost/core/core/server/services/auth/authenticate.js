const session = require('./session');
const apiKeyAuth = require('./api-key');
const members = require('./members');

const authenticate = {
    authenticateAdminApi: [apiKeyAuth.admin.authenticate, session.authenticate],
    authenticateAdminApiWithUrl: [apiKeyAuth.admin.authenticateWithUrl],

    authenticateContentApi: [apiKeyAuth.content.authenticateContentApiKey, members.authenticateMembersToken]
};

module.exports = authenticate;
