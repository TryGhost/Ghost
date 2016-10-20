var errors = require('../../../../errors'),
    versioning = require('../../../schema/versioning'),
    database = require('../../../db');

module.exports = function after(options) {
    return versioning.getDatabaseVersion(options)
        .catch(function (err) {
            if (err instanceof errors.DatabaseVersionError && err.code === 'VERSION_DOES_NOT_EXIST') {
                return versioning.setDatabaseVersion(options);
            }

            throw err;
        })
        .finally(function destroyConnection() {
            return database.knex.destroy();
        });
};
