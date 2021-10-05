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
        return await this.repository.existsByCode(code, this.options);
    }

    /**
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async isUniqueName(name) {
        return await this.repository.existsByName(name, this.options);
    }
}

module.exports = UniqueChecker;
