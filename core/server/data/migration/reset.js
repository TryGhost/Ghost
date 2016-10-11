// ### Reset
// Delete all tables from the database in reverse order
var Promise = require('bluebird'),
    commands = require('../schema').commands,
    schema = require('../schema').tables,
    schemaTables = Object.keys(schema).reverse(),
    reset;

/**
 * # Reset
 * Deletes all the tables defined in the schema
 * Uses reverse order, which ensures that foreign keys are removed before the parent table
 *
 * @TODO:
 * - move to sephiroth
 * - then deleting migrations table will make sense
 *
 * @returns {Promise<*>}
 */
reset = function reset() {
    var result;

    return Promise.mapSeries(schemaTables, function (table) {
        return commands.deleteTable(table);
    }).then(function (_result) {
        result = _result;

        return commands.deleteTable('migrations');
    }).then(function () {
        return result;
    });
};

module.exports = reset;
