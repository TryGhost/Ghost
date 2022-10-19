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
     * @typedef {Object} ImportOptions
     * @property {Array<string>} ids List of ids to generate each new object referencing
     */

    /**
     * @param {number} amount Number of items to generate
     * @param {ImportOptions} [options] Other options
     * @returns {Promise<Array<string>>}
     */
    async import(amount = 0, options) {
        if (amount === 0) {
            return;
        }

        const data = [];
        if (options && options.ids) {
            for (const id of options.ids) {
                for (let i = 0; i < amount; i++) {
                    data.push(this.generate(id));
                }
            }
        } else {
            for (let i = 0; i < amount; i++) {
                data.push(this.generate());
            }
        }

        const objects = await this.knex.insert(data, ['id']).into(this.name);
        return objects.map(o => o.id);
    }

    /**
     * @params {string} [id]
     * @returns {Object} Data to import
     */
    generate(id) {
        // Should never be called
        return id;
    }
}

module.exports = TableImporter;
