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

    async import(amount = this.defaultQuantity) {
        const batchSize = 500;
        let batch = [];

        for (let i = 0; i < amount; i++) {
            const model = await this.generate();
            if (model) {
                batch.push(model);
            } else {
                // After first null assume that there is no more data
                break;
            }
            if (batch.length === batchSize) {
                await this.knex.batchInsert(this.name, batch, batchSize).transacting(this.transaction);
                batch = [];
            }
        }

        // Process final batch
        if (batch.length > 0) {
            await this.knex.batchInsert(this.name, batch, batchSize).transacting(this.transaction);
        }
    }

    /**
     * @param {Array<Object>} models List of models to reference
     * @param {Number|function} amount Number of records to import per model
     */
    async importForEach(models = [], amount) {
        const batchSize = 500;
        let batch = [];

        for (const model of models) {
            this.setReferencedModel(model);
            let currentAmount = (typeof amount === 'function') ? amount() : amount;
            if (!Number.isInteger(currentAmount)) {
                currentAmount = Math.floor(currentAmount) + ((Math.random() < currentAmount % 1) ? 1 : 0);
            }
            for (let i = 0; i < currentAmount; i++) {
                const data = await this.generate();
                if (data) {
                    batch.push(data);
                } else {
                    // After first null assume that there is no more data for this model
                    break;
                }
                if (batch.length === batchSize) {
                    await this.knex.batchInsert(this.name, batch, batchSize).transacting(this.transaction);
                    batch = [];
                }
            }
        }

        // Process final batch
        if (batch.length > 0) {
            await this.knex.batchInsert(this.name, batch, batchSize).transacting(this.transaction);
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
