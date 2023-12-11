const debug = require('@tryghost/debug')('TableImporter');

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
            debug (`Importing ${data.length} records into ${this.name}`);
            const now = Date.now();
            await this.knex.batchInsert(this.name, data).transacting(this.transaction);
            debug(`${this.name} imported ${data.length} records in ${Date.now() - now}ms`);
        }
    }

    /**
     * @param {Array<Object>} models List of models to reference
     * @param {Number|function} amount Number of records to import per model
     */
    async importForEach(models = [], amount) {
        const data = [];

        debug (`Generating data for ${models.length} models for ${this.name}`);
        const now = Date.now();

        for (const model of models) {
            this.setReferencedModel(model);
            let currentAmount = (typeof amount === 'function') ? amount() : amount;
            if (!Number.isInteger(currentAmount)) {
                currentAmount = Math.floor(currentAmount) + ((Math.random() < currentAmount % 1) ? 1 : 0);
            }

            const generatedData = await this.#generateData(currentAmount);
            if (generatedData.length > 0) {
                data.push(...generatedData);
            }
        }

        debug(`${this.name} generated ${data.length} records in ${Date.now() - now}ms`);

        if (data.length > 0) {
            const now2 = Date.now();
            await this.knex.batchInsert(this.name, data).transacting(this.transaction);
            debug(`${this.name} imported ${data.length} records in ${Date.now() - now2}ms`);
        }
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
