const _ = require('lodash');
const {CHUNK_SIZE} = require('./bulk-filters');

function createBulkOperation(singular, multiple) {
    return async function (knex, table, data, options) {
        const result = {
            successful: 0,
            unsuccessful: 0,
            unsuccessfulData: [],
            errors: []
        };

        for (const chunkedData of _.chunk(data, CHUNK_SIZE)) {
            try {
                await multiple(knex, table, chunkedData, options);
                result.successful += chunkedData.length;
            } catch (errToIgnore) {
                if (options.throwErrors) {
                    throw errToIgnore;
                }
                for (const singularData of chunkedData) {
                    try {
                        await singular(knex, table, singularData, options);
                        result.successful += 1;
                    } catch (err) {
                        err.errorDetails = singularData;
                        result.errors.push(err);
                        result.unsuccessfulData.push(singularData);
                        result.unsuccessful += 1;
                    }
                }
            }
        }

        return result;
    };
}

async function insertSingle(knex, table, record, options) {
    let k = knex(table);
    if (options.transacting) {
        k = k.transacting(options.transacting);
    }
    await k.insert(record);
}

async function insertMultiple(knex, table, chunk, options) {
    let k = knex(table);
    if (options.transacting) {
        k = k.transacting(options.transacting);
    }
    await k.insert(chunk);
}

const insert = createBulkOperation(insertSingle, insertMultiple);

/**
 * Execute a bulk operation (update or delete) with a where strategy.
 * Iterates over each query modifier yielded by the strategy, applies it to
 * a fresh query builder, and executes the operation.
 *
 * @param {import('knex')} knex - Knex instance
 * @param {string} tableName - Table to operate on
 * @param {object} options
 * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
 * @param {object} [options.transacting] - Knex transaction
 * @param {(qb: import('knex').QueryBuilder) => Promise<number>} operation - The operation to perform (update/delete)
 * @returns {Promise<number>} Total affected rows
 */
async function bulkWhereOperation(knex, tableName, {where, transacting}, operation) {
    let affectedRows = 0;
    for (const applyWhere of where) {
        let qb = knex(tableName);
        if (transacting) {
            qb = qb.transacting(transacting);
        }
        applyWhere(qb);
        affectedRows += await operation(qb);
    }
    return affectedRows;
}

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        bulkAdd: function bulkAdd(data, tableName, options = {}) {
            tableName = tableName || this.prototype.tableName;

            return insert(Bookshelf.knex, tableName, data, options);
        },

        /**
         * Update rows matching a where strategy (e.g. byNQL, byIds, byColumnValues).
         * The `where` parameter is an iterable of query modifier functions,
         * each yielded value applies a WHERE clause to a fresh query.
         *
         * @param {string} tableName - Table to update (defaults to model's table)
         * @param {object} query - Query parameters
         * @param {object} query.data - Column values to set
         * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} query.where - Where strategy
         * @param {object} [query.transacting] - Knex transaction
         * @param {object} [actionOptions] - Action logging options
         * @param {object} [actionOptions.context] - Context for action logging (contains actor info)
         * @param {string} [actionOptions.actionName] - Custom action name for audit log
         * @param {string[]} [actionOptions.actionIds] - If provided and tableName is the model's main table, log 'edited' actions for these IDs
         * @returns {Promise<number>} Total affected rows
         */
        bulkUpdate: async function bulkUpdate(tableName, {data, where, transacting}, actionOptions = {}) {
            tableName = tableName || this.prototype.tableName;
            const affectedRows = await bulkWhereOperation(
                Bookshelf.knex,
                tableName,
                {where, transacting},
                qb => qb.update(data)
            );
            // Log actions if IDs provided and operating on main table
            if (actionOptions.actionIds && affectedRows > 0 && tableName === this.prototype.tableName) {
                await this.addActions('edited', actionOptions.actionIds, {...actionOptions, transacting});
            }
            return affectedRows;
        },

        /**
         * Delete rows matching a where strategy (e.g. byNQL, byIds, byColumnValues).
         * The `where` parameter is an iterable of query modifier functions,
         * each yielded value applies a WHERE clause to a fresh query.
         *
         * @param {string} tableName - Table to delete from (defaults to model's table)
         * @param {object} query - Query parameters
         * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} query.where - Where strategy
         * @param {object} [query.transacting] - Knex transaction
         * @param {object} [actionOptions] - Action logging options
         * @param {object} [actionOptions.context] - Context for action logging (contains actor info)
         * @param {string} [actionOptions.actionName] - Custom action name for audit log
         * @param {string[]} [actionOptions.actionIds] - If provided and tableName is the model's main table, log 'deleted' actions for these IDs (must be called before delete)
         * @returns {Promise<number>} Total affected rows
         */
        bulkDelete: async function bulkDelete(tableName, {where, transacting}, actionOptions = {}) {
            tableName = tableName || this.prototype.tableName;
            // Log actions before deletion (needs to happen before, otherwise we cannot fetch the names of the deleted items)
            if (actionOptions.actionIds && tableName === this.prototype.tableName) {
                await this.addActions('deleted', actionOptions.actionIds, {...actionOptions, transacting});
            }
            return bulkWhereOperation(
                Bookshelf.knex,
                tableName,
                {where, transacting},
                qb => qb.del()
            );
        }
    });
};

