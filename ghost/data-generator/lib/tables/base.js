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

        this.setImportOptions(options);

        // Use dynamic amount if faker function given
        const amount = (typeof options.amount === 'function') ? options.amount() : options.amount;

        const data = [];
        for (let i = 0; i < amount; i++) {
            const model = this.generate();
            if (model) {
                // Only push models when one is generated successfully
                data.push(model);
            }
        }

        return await this.knex.insert(data, ['id']).into(this.name);
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
