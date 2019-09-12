const Promise = require('bluebird');

// NB: clients and client_trusted_domains were removed in 3.0 so the fixtures previously used here no longer exist
module.exports.up = function addGhostBackupClient() {
    return Promise.resolve();
};

module.exports.down = function removeGhostBackupClient() {
    return Promise.resolve();
};
