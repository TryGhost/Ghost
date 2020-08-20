const _ = require('lodash');
const db = require('../../../data/db');

const CHUNK_SIZE = 100;

async function insert(table, data) {
    const result = {
        successful: 0,
        unsuccessful: 0,
        errors: []
    };

    for (const chunk of _.chunk(data, CHUNK_SIZE)) {
        try {
            await db.knex(table).insert(chunk);
            result.successful += chunk.length;
        } catch (error) {
            result.unsuccessful += chunk.length;
            result.errors.push(error);
        }
    }

    return result;
}

async function del(table, ids) {
    const result = {
        successful: 0,
        unsuccessful: 0,
        errors: []
    };

    for (const chunk of _.chunk(ids, CHUNK_SIZE)) {
        try {
            await db.knex(table).whereIn('id', chunk).del();
            result.successful += chunk.length;
        } catch (error) {
            result.unsuccessful += chunk.length;
            result.errors.push(error);
        }
    }

    return result;
}

module.exports.insert = insert;
module.exports.del = del;
