const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

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

async function insertSingle(knex, table, record) {
    await knex(table).insert(record);
}

async function insertMultiple(knex, table, chunk) {
    await knex(table).insert(chunk);
}

async function editSingle(knex, table, id, options) {
    await knex(table).where('id', id).update(options.data);
}

async function editMultiple(knex, table, chunk, options) {
    await knex(table).whereIn('id', chunk).update(options.data);
}

async function delSingle(knex, table, id) {
    try {
        await knex(table).where('id', id).del();
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

async function delMultiple(knex, table, chunk) {
    await knex(table).whereIn('id', chunk).del();
}

const insert = createBulkOperation(insertSingle, insertMultiple);
const edit = createBulkOperation(editSingle, editMultiple);
const del = createBulkOperation(delSingle, delMultiple);

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        bulkAdd: function bulkAdd(data, tableName) {
            tableName = tableName || this.prototype.tableName;

            return insert(Bookshelf.knex, tableName, data);
        },

        bulkEdit: function bulkEdit(data, tableName, options) {
            tableName = tableName || this.prototype.tableName;

            return edit(Bookshelf.knex, tableName, data, options);
        },

        bulkDestroy: function bulkDestroy(data, tableName) {
            tableName = tableName || this.prototype.tableName;

            return del(Bookshelf.knex, tableName, data);
        }
    });
};
