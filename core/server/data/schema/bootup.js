var Promise = require('bluebird'),
    Sephiroth = require('../sephiroth'),
    db = require('../db'),
    config = require('./../../config'),
    errors = require('./../../errors'),
    models = require('./../../models'),
    versioning = require('./../../data/schema/versioning'),
    logging = require('./../../logging'),
    fixtures = require('../migration/fixtures'),
    i18n = require('./../../i18n'),
    sephiroth = new Sephiroth({database: config.get('database')});

/**
 * @TODO:
 * - move this file out of schema folder
 * - this file right now takes over seeding, which get's fixed in one of the next PR's
 * - remove fixtures.populate
 * - remove versioning.setDatabaseVersion(transaction);
 * - remove models.Settings.populateDefaults(_.merge({}, {transacting: transaction}, modelOptions));
 * - key: migrations-kate
 */
module.exports = function bootUp() {
    var modelOptions = {
        context: {
            internal: true
        }
    };

    return sephiroth.utils.isDatabaseOK()
        .then(function () {
            return models.Settings.populateDefaults(modelOptions);
        })
        .then(function () {
            return versioning.setDatabaseVersion(db.knex);
        })
        .then(function () {
            return fixtures.populate(logging, modelOptions);
        })
        .catch(function (err) {
            if ([sephiroth.utils.errors.dbInitMissing, sephiroth.utils.errors.migrationsTableMissing].indexOf(err.code) !== -1) {
                return Promise.reject(new errors.DatabaseNotPopulated(
                    i18n.t('errors.data.versioning.index.databaseNotInitialised'),
                    i18n.t('errors.data.versioning.index.databaseNotInitialisedContext')
                ));
            }

            return Promise.reject(err);
        });
};
