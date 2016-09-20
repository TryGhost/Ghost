var Promise = require('bluebird'),
    versioning = require('./versioning'),
    migrations = require('../migration'),
    errors = require('./../../errors');

module.exports = function bootUp() {
    return versioning
        .getDatabaseVersion()
        .then(function successHandler(result) {
            if (!/^alpha/.test(result)) {
                // This database was not created with Ghost alpha, and is not compatible
                throw new errors.DatabaseVersion(
                    'Your database version is not compatible with Ghost 1.0.0 Alpha (master branch)',
                    'Want to keep your DB? Use Ghost < 1.0.0 or the "stable" branch. Otherwise please delete your DB and restart Ghost',
                    'More information on the Ghost 1.0.0 Alpha at https://support.ghost.org/v1-0-alpha'
                );
            }
        },
        // We don't use .catch here, as it would catch the error from the successHandler
        function errorHandler(err) {
            if (err instanceof errors.DatabaseNotPopulated) {
                return migrations.populate();
            }

            return Promise.reject(err);
        });
};
