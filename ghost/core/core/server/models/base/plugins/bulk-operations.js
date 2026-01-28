const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const nql = require('@tryghost/nql');

const CHUNK_SIZE = 100;

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

async function editSingle(knex, table, id, options) {
    let k = knex(table);
    if (options.transacting) {
        k = k.transacting(options.transacting);
    }
    await k.where(options.column ?? 'id', id).update(options.data);
}

async function editMultiple(knex, table, chunk, options) {
    let k = knex(table);
    if (options.transacting) {
        k = k.transacting(options.transacting);
    }
    await k.whereIn(options.column ?? 'id', chunk).update(options.data);
}

async function delSingle(knex, table, id, options) {
    try {
        let k = knex(table);
        if (options.transacting) {
            k = k.transacting(options.transacting);
        }
        await k.where(options.column ?? 'id', id).del();
    } catch (err) {
        const importError = new errors.DataImportError({
            message: `Failed to remove entry from ${table}`,
            context: `Entry id: ${id}`,
            err: err
        });
        logging.error(importError);
        throw importError;
    }
}

async function delMultiple(knex, table, chunk, options) {
    let k = knex(table);
    if (options.transacting) {
        k = k.transacting(options.transacting);
    }
    await k.whereIn(options.column ?? 'id', chunk).del();
}

const insert = createBulkOperation(insertSingle, insertMultiple);
const edit = createBulkOperation(editSingle, editMultiple);
const del = createBulkOperation(delSingle, delMultiple);

/**
 * Creates a where strategy that applies an NQL filter to the query builder.
 * Yields a single query modifier — no chunking.
 *
 * @param {string} filter - NQL filter string (e.g. "member_id:'abc'+status:published")
 * @yields {(qb: import('knex').QueryBuilder) => void}
 */
function* byNQL(filter) {
    yield (qb) => {
        nql(filter).querySQL(qb);
    };
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
         *
         * @param {*} ids
         * @param {*} tableName
         * @param {object} options
         * @param {object} [options.data] Data change you want to apply to the rows
         * @param {string} [options.column] Update the rows where this column equals the ids (defaults to 'id')
         * @returns
         */
        bulkEdit: async function bulkEdit(ids, tableName, options = {}) {
            tableName = tableName || this.prototype.tableName;

            const result = await edit(Bookshelf.knex, tableName, ids, options);

            if (result.successful > 0 && tableName === this.prototype.tableName) {
                await this.addActions('edited', ids, options);
            }

            return result;
        },

        /**
         *
         * @param {string[]} ids List of ids to delete
         * @param {*} tableName
         * @param {Object} [options]
         * @param {string} [options.column] Delete the rows where this column equals the ids in `data` (defaults to 'id')
         * @returns
         */
        bulkDestroy: async function bulkDestroy(ids, tableName, options = {}) {
            tableName = tableName || this.prototype.tableName;

            if (tableName === this.prototype.tableName) {
                // Needs to happen before, otherwise we cannot fetch the names of the deleted items
                await this.addActions('deleted', ids, options);
            }

            return await del(Bookshelf.knex, tableName, ids, options);
        },

        /**
         * Update rows matching a where strategy (e.g. byNQL).
         * The `where` parameter is an iterable of query modifier functions,
         * each yielded value applies a WHERE clause to a fresh query.
         *
         * @param {string} tableName
         * @param {object} options
         * @param {object} options.data - Column values to set
         * @param {Iterable<(qb: import('knex').QueryBuilder) => void>} options.where - Where strategy
         * @param {object} [options.transacting] - Knex transaction
         */
        bulkUpdate: async function bulkUpdate(tableName, {data, where, transacting}) {
            tableName = tableName || this.prototype.tableName;

            let affectedRows = 0;
            for (const applyWhere of where) {
                let qb = Bookshelf.knex(tableName);
                if (transacting) {
                    qb = qb.transacting(transacting);
                }
                applyWhere(qb);
                affectedRows += await qb.update(data);
            }

            return affectedRows;
        }
    });
};

module.exports.byNQL = byNQL;
