class UniqueChecker {
    /**
     * @param {import('./OfferRepository')} repository
     * @param {import('knex').Transaction} transaction
     */
    constructor(repository, transaction) {
        this.repository = repository;
        this.options = {
            transacting: transaction
        };
    }

    /**
     * @param {string} code
     * @returns {Promise<boolean>}
     */
    async isUniqueCode(code) {
        const exists = await this.repository.existsByCode(code, this.options);
        return !exists;
    }

    /**
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async isUniqueName(name) {
        const exists = await this.repository.existsByName(name, this.options);
        return !exists;
    }
}

module.exports = UniqueChecker;
