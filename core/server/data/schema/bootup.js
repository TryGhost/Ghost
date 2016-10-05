var Promise = require('bluebird'),
    versioning = require('./versioning'),
    populate = require('../migration/populate'),
    errors = require('./../../errors');

module.exports = function bootUp() {
    /**
     * @TODO:
     * - 1. call is check if tables are populated
     * - 2. call is check if db is seeded
     *
     * These are the calls Ghost will make to find out if the db is in OK state!
     * These check's will have nothing to do with the migration module!
     * Ghost will not touch the migration module at all.
     *
     * Example code:
     * models.Settings.findOne({key: 'databasePopulated'})
     * If not, throw error and tell user what to do (ghost db-init)!
     *
     * versioning.getDatabaseVersion() - not sure about that yet.
     * This will read the database version of the settings table!
     * If not, throw error and tell user what to do (ghost db-seed)!
     *
     * @TODO:
     * - remove return populate() -> belongs to db init
     */
    return versioning
        .getDatabaseVersion()
        .catch(function errorHandler(err) {
            if (err instanceof errors.DatabaseNotPopulatedError) {
                return populate();
            }

            return Promise.reject(err);
        });
};
