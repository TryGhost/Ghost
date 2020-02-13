var dbBackup = require('../../../db/backup'),
    models = require('../../../../models');

module.exports = function before() {
    models.init();
    return dbBackup.backup();
};
