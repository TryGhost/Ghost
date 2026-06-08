const dbBackup = require('../../../db/backup');

module.exports = function before() {
    return dbBackup.backup();
};
