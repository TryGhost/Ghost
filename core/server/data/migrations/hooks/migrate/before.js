const dbBackup = require('../../../db/backup');
const models = require('../../../../models');

module.exports = function before() {
    models.init();
    return dbBackup.backup();
};
