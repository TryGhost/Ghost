const authenticate = require('./authenticate'),
    authorize = require('./authorize');

module.exports.contentAPI = [authenticate.authenticateContentAPI, authorize.authorizeContentAPI];
module.exports.adminAPI = [authenticate.authenticateAdminAPI, authorize.authorizeAdminAPI];
