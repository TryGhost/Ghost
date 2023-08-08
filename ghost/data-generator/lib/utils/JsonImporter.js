const {faker} = require('@faker-js/faker');

class JsonImporter {
    constructor(knex, transaction) {
        this.knex = knex;
        this.transaction = transaction;
    }

    /**
     * @typedef {Object} JsonImportOptions
     * @property {string} name Name of the table to import
     * @property {Object} data Models without ids to be imported
     * @property {Array<string>} [rows] Set of rows to be returned
     */

    /**
     * Import a dataset to the database
     * @param {JsonImportOptions} options
     * @returns {Promise}
     */
    async import({
        name,
        data,
        rows = []
    }) {
        for (const obj of data) {
            if (!('id' in obj)) {
                obj.id = faker.database.mongodbObjectId();
            }
        }
        if (rows.findIndex(row => row === 'id') === -1) {
            rows.unshift('id');
        }
        await this.knex.batchInsert(name, data, 500).transacting(this.transaction);
    }
}

module.exports = JsonImporter;
