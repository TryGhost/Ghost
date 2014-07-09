var api         = require('./api'),
    admin       = require('./admin'),
    frontend    = require('./frontend');

module.exports = {
    apiBaseUri: '/ghost/api/v0.1/',
    api: api,
    admin: admin,
    frontend: frontend
};