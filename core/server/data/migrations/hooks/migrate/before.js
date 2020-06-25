const dbBackup = require('../../../db/backup');
const models = require('../../../../models');

module.exports = function before() {
    models.init();
    return dbBackup.backup().then(() => {
        // ensure that our default settings are created to limit possible db states in migrations
        return models.Settings.populateDefaults();
    });
};
