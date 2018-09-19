const authenticate = require('./authenticate');
const authorize = require('./authorize');

module.exports.adminAPI = [authenticate.authenticateAdminAPI, authorize.authorizeAdminAPI];
