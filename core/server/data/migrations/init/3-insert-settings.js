var _ = require('lodash'),
    models = require('../../../models'),
    errors = require('../../../errors'),
    versioning = require('../../schema/versioning');

// @TODO: models.init
module.exports = function insertSettings(options) {
    var localOptions = _.merge({context: {internal: true}}, options);

    models.init();

    return models.Settings.populateDefaults(localOptions)
        .then(function () {
            return versioning.getDatabaseVersion(localOptions);
        })
        .catch(function (err) {
            if (err instanceof errors.DatabaseVersionError && err.code === 'VERSION_DOES_NOT_EXIST') {
                return versioning.setDatabaseVersion(localOptions);
            }

            throw err;
        });
};
