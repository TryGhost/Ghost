class TableImporter {
    /**
     * @param {string} name Name of the table to be generated
     * @param {import('knex/types').Knex} knex Database connection
     */
    constructor(name, knex) {
        this.name = name;
        this.knex = knex;
    }

    /**
     * @typedef {Function} AmountFunction
     * @returns {number}
     */

    /**
     * @typedef {Object.<string,any>} ImportOptions
     * @property {number|AmountFunction} amount Number of events to generate
     * @property {Object} [model] Used to reference another object during creation
     */

    /**
     * @param {Array<Object>} models List of models to reference
     * @param {ImportOptions} [options] Import options
     * @returns {Promise<Array<Object>>}
     */
    async importForEach(models = [], options) {
        const results = [];
        for (const model of models) {
            results.push(...await this.import(Object.assign({}, options, {model})));
        }
        return results;
    }

    /**
     * @param {ImportOptions} options Import options
     * @returns {Promise<Array<Object>>}
     */
    async import(options) {
        if (options.amount === 0) {
            return;
        }

        // Use dynamic amount if faker function given
        const amount = (typeof options.amount === 'function') ? options.amount() : options.amount;

        this.setImportOptions(Object.assign({}, options, {amount}));

        const data = [];
        for (let i = 0; i < amount; i++) {
            const model = await this.generate();
            if (model) {
                // Only push models when one is generated successfully
                data.push(model);
            } else {
                // After first null assume that there is no more data
                break;
            }
        }

        const rows = ['id'];
        if (options && options.rows) {
            rows.push(...options.rows);
        }
        await this.knex.batchInsert(this.name, data, 500);
        return await this.knex.select(...rows).whereIn('id', data.map(obj => obj.id)).from(this.name);
    }

    /**
     *
     * @param {ImportOptions} options
     * @returns {void}
     */
    // eslint-disable-next-line no-unused-vars
    setImportOptions(options) {
        return;
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
