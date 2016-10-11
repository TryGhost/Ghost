var Promise = require('bluebird'),
    Sephiroth = require('../sephiroth'),
    db = require('../db'),
    config = require('./../../config'),
    errors = require('./../../errors'),
    models = require('./../../models'),
    versioning = require('./../../data/schema/versioning'),
    logging = require('./../../logging'),
    fixtures = require('../migration/fixtures'),
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
            return Promise.reject(new errors.GhostError({
                err: err
            }));
        });
};
