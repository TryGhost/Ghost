const _ = require('lodash');
const errors = require('@tryghost/errors');
const db = require('../../data/db');
const logging = require('../../../shared/logging');

const CHUNK_SIZE = 100;

async function insertChunkSequential(table, chunk, result) {
    for (const record of chunk) {
        try {
            await db.knex(table).insert(record);
            result.successful += 1;
        } catch (err) {
            err.errorDetails = record;
            result.errors.push(err);
            result.unsuccessfulRecords.push(record);
            result.unsuccessful += 1;
        }
    }
}

async function insertChunk(table, chunk, result) {
    try {
        await db.knex(table).insert(chunk);
        result.successful += chunk.length;
    } catch (err) {
        await insertChunkSequential(table, chunk, result);
    }
}

async function insert(table, data) {
    const result = {
        successful: 0,
        unsuccessful: 0,
        unsuccessfulRecords: [],
        errors: []
    };

    for (const chunk of _.chunk(data, CHUNK_SIZE)) {
        await insertChunk(table, chunk, result);
    }

    return result;
}

async function delChunkSequential(table, chunk, result) {
    for (const id of chunk) {
        try {
            await db.knex(table).where('id', id).del();
            result.successful += 1;
        } catch (err) {
            const importError = new errors.DataImportError({
                message: `Failed to remove entry from ${table}`,
                context: `Entry id: ${id}`,
                err: err
            });
            logging.error(importError);

            result.errors.push(importError);
            result.unsuccessfulIds.push(id);
            result.unsuccessful += 1;
        }
    }
}

async function delChunk(table, chunk, result) {
    try {
        await db.knex(table).whereIn('id', chunk).del();
        result.successful += chunk.length;
    } catch (err) {
        await delChunkSequential(table, chunk, result);
    }
}

async function del(table, ids) {
    const result = {
        successful: 0,
        unsuccessful: 0,
        unsuccessfulIds: [],
        errors: []
    };

    for (const chunk of _.chunk(ids, CHUNK_SIZE)) {
        await delChunk(table, chunk, result);
    }

    return result;
}

module.exports.insert = insert;
module.exports.del = del;
