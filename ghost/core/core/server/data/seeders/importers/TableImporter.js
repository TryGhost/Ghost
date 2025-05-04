const debug = require('@tryghost/debug')('TableImporter');
const dateToDatabaseString = require('../utils/database-date');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const {luck} = require('../utils/random');
const os = require('os');
const crypto = require('crypto');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

class TableImporter {
    /**
     * @type {object|undefined} model Referenced model when generating data
     */
    model;

    /**
     * @type {number|undefined} defaultQuantity Default number of records to import
     */
    defaultQuantity;

    /**
     * Transaction and knex need to be separate since we're using the batchInsert helper
     * @param {string} name Name of the table to be generated
     * @param {import('knex/types').Knex} knex Database connection
     * @param {import('knex/types').Knex.Transaction} transaction Transaction to be used for import
     */
    constructor(name, knex, transaction) {
        this.name = name;
        this.knex = knex;
        this.transaction = transaction;
    }

    fastFakeObjectId() {
        // It is important that IDs are generated for a timestamp < NOW (for email batch sending) and that
        // generating the ids is fast.
        return `00000000` + crypto.randomBytes(8).toString('hex');
    }

    async #generateData(amount = this.defaultQuantity) {
        let data = [];

        for (let i = 0; i < amount; i++) {
            const model = await this.generate();
            if (model) {
                data.push(model);
            }
        }

        return data;
    }

    async import(amount = this.defaultQuantity) {
        const generateNow = Date.now();
        const data = await this.#generateData(amount);
        debug(`${this.name} generated ${data.length} records in ${Date.now() - generateNow}ms`);

        if (data.length > 0) {
            await this.batchInsert(data);
        }
    }

    /**
     * @param {Array<Object>} models List of models to reference
     * @param {Number|function} amount Number of records to import per model
     */
    async importForEach(models = [], amount) {
        const data = [];

        debug (`Generating data for ${models.length} models x ${amount} for ${this.name}`);
        const now = Date.now();
        let settingReferenceModel = 0;

        for (const model of models) {
            let s = Date.now();
            this.setReferencedModel(model);
            settingReferenceModel += Date.now() - s;

            let currentAmount = (typeof amount === 'function') ? amount() : amount;
            if (!Number.isInteger(currentAmount)) {
                currentAmount = Math.floor(currentAmount) + luck((currentAmount % 1) * 100);
            }

            const generatedData = await this.#generateData(currentAmount);
            if (generatedData.length > 0) {
                data.push(...generatedData);
            }
        }

        debug(`${this.name} generated ${data.length} records in ${Date.now() - now}ms (${settingReferenceModel}ms setting reference model)`);

        if (data.length > 0) {
            await this.batchInsert(data);
        }
    }

    async batchInsert(data) {
        // Write to CSV file
        const rootFolder = os.tmpdir();
        const filePath = path.join(rootFolder, `${this.name}.csv`);
        let now = Date.now();

        if (data.length > 5000 && !process.env.DISABLE_FAST_IMPORT) {
            try {
                await fs.promises.unlink(filePath);
            } catch (e) {
                // Ignore: file doesn't exist
            }

            const csvWriter = createCsvWriter({
                path: filePath,
                header: Object.keys(data[0]).map((key) => {
                    return {id: key, title: key};
                })
            });

            // Loop the data in chunks of 50.000 items
            const batchSize = 50000;

            // Otherwise we get a out of range error because csvWriter tries to create a string that is too long
            for (let i = 0; i < data.length; i += batchSize) {
                const slicedData = data.slice(i, i + batchSize);

                // Map data to what MySQL expects in the CSV for values like booleans, null and dates
                for (let j = 0; j < slicedData.length; j++) {
                    const obj = slicedData[j];

                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'boolean') {
                            obj[key] = value ? 1 : 0;
                        } else if (value instanceof Date) {
                            obj[key] = dateToDatabaseString(value);
                        } else if (value === null) {
                            obj[key] = '\\N';
                        }
                    }
                }
                await csvWriter.writeRecords(slicedData);
            }

            debug(`${this.name} saved CSV import file in ${Date.now() - now}ms`);
            now = Date.now();

            // Import from CSV file
            const [result] = await this.transaction.raw(`LOAD DATA LOCAL INFILE '${filePath}' INTO TABLE \`${this.name}\` FIELDS TERMINATED BY ',' ENCLOSED BY '"' IGNORE 1 LINES (${Object.keys(data[0]).map(d => '`' + d + '`').join(',')});`);
            if (result.affectedRows !== data.length) {
                if (Math.abs(result.affectedRows - data.length) > 0.01 * data.length) {
                    throw new errors.InternalServerError({
                        message: `CSV import failed: expected ${data.length} imported rows, got ${result.affectedRows}`
                    });
                }
                logging.warn(`CSV import warning: expected ${data.length} imported rows, got ${result.affectedRows}.`);
            }
        } else {
            await this.knex.batchInsert(this.name, data).transacting(this.transaction);
        }

        debug(`${this.name} imported ${data.length} records in ${Date.now() - now}ms`);
    }

    /**
     * Finalise the imported data, e.g. adding summary records based on a table's dependents
     */
    async finalise() {
        // No-op by default
    }

    /**
     * Sets the model which newly generated data will reference
     * @param {Object} model Model to reference when generating data
     */
    setReferencedModel(model) {
        this.model = model;
    }

    /**
     * Generates the data for a single model to be imported
     * @returns {Object|null} Data to import, optional
     */
    generate() {
        // Should never be called
        return false;
    }
}

module.exports = TableImporter;
