const _ = require('lodash');
const {byColumnValues, CHUNK_SIZE} = require('./bulk-filters');

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
         * Edit rows matching a where strategy (e.g. byNQL, byIds, byColumnValues).
         * Pure data operation — no action logging.
         *
         * @param {object} options
         * @param {object} options.data - Column values to set
         * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
         * @param {object} [options.transacting] - Knex transaction
         * @param {string} [options.tableName] - Table to update (defaults to model's table)
         * @returns {Promise<number>} Total affected rows
         */
        bulkEditWhere: async function bulkEditWhere({data, where, transacting, tableName}) {
            tableName = tableName || this.prototype.tableName;
            return bulkWhereOperation(
                Bookshelf.knex,
                tableName,
                {where, transacting},
                qb => qb.update(data)
            );
        },

        /**
         * Delete rows matching a where strategy (e.g. byNQL, byIds, byColumnValues).
         * Pure data operation — no action logging.
         *
         * @param {object} options
         * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
         * @param {object} [options.transacting] - Knex transaction
         * @param {string} [options.tableName] - Table to delete from (defaults to model's table)
         * @returns {Promise<number>} Total affected rows
         */
        bulkDestroyWhere: async function bulkDestroyWhere({where, transacting, tableName}) {
            tableName = tableName || this.prototype.tableName;
            return bulkWhereOperation(
                Bookshelf.knex,
                tableName,
                {where, transacting},
                qb => qb.del()
            );
        },

        /**
         * Edit rows by ID list, with action logging.
         *
         * @param {string[]} ids - IDs (or column values) to match
         * @param {string} tableName - Table to update (defaults to model's table)
         * @param {object} [options]
         * @param {object} [options.data] - Column values to set
         * @param {string} [options.column] - Column to match against (defaults to 'id')
         * @returns {Promise<{successful: number, unsuccessful: number, errors: Array, unsuccessfulData: Array}>}
         */
        bulkEdit: async function bulkEdit(ids, tableName, options = {}) {
            tableName = tableName || this.prototype.tableName;

            try {
                const affectedRows = await this.bulkEditWhere({
                    data: options.data,
                    where: byColumnValues(options.column ?? 'id', ids),
                    transacting: options.transacting,
                    tableName
                });

                if (affectedRows > 0 && tableName === this.prototype.tableName) {
                    await this.addActions('edited', ids, options);
                }

                return {successful: ids.length, unsuccessful: 0, errors: [], unsuccessfulData: []};
            } catch (err) {
                if (options.throwErrors) {
                    throw err;
                }
                return {
                    successful: 0,
                    unsuccessful: ids.length,
                    errors: ids.map((id) => {
                        const e = Object.create(err);
                        e.errorDetails = id;
                        return e;
                    }),
                    unsuccessfulData: ids
                };
            }
        },

        /**
         * Delete rows by ID list, with action logging.
         *
         * @param {string[]} ids - IDs (or column values) to match
         * @param {string} tableName - Table to delete from (defaults to model's table)
         * @param {object} [options]
         * @param {string} [options.column] - Column to match against (defaults to 'id')
         * @returns {Promise<{successful: number, unsuccessful: number, errors: Array, unsuccessfulData: Array}>}
         */
        bulkDestroy: async function bulkDestroy(ids, tableName, options = {}) {
            tableName = tableName || this.prototype.tableName;

            if (tableName === this.prototype.tableName) {
                // Needs to happen before, otherwise we cannot fetch the names of the deleted items
                await this.addActions('deleted', ids, options);
            }

            try {
                await this.bulkDestroyWhere({
                    where: byColumnValues(options.column ?? 'id', ids),
                    transacting: options.transacting,
                    tableName
                });

                return {successful: ids.length, unsuccessful: 0, errors: [], unsuccessfulData: []};
            } catch (err) {
                if (options.throwErrors) {
                    throw err;
                }
                return {
                    successful: 0,
                    unsuccessful: ids.length,
                    errors: ids.map((id) => {
                        const e = Object.create(err);
                        e.errorDetails = id;
                        return e;
                    }),
                    unsuccessfulData: ids
                };
            }
        }
    });
};
