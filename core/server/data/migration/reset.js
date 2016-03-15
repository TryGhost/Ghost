// ### Reset
// Delete all tables from the database in reverse order
var Promise      = require('bluebird'),
    commands     = require('../schema').commands,
    schema       = require('../schema').tables,

    schemaTables = Object.keys(schema).reverse(),
    reset;

/**
 * # Reset
 * Deletes all the tables defined in the schema
 * Uses reverse order, which ensures that foreign keys are removed before the parent table
 *
 * @returns {Promise<*>}
 */
reset = function reset() {
    return Promise.mapSeries(schemaTables, function (table) {
        return commands.deleteTable(table);
    });
};

module.exports = reset;
