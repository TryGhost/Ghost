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
     * @param {import('../domain/models/offer-code')} code
     * @returns {Promise<boolean>}
     */
    async isUniqueCode(code) {
        const exists = await this.repository.existsByCode(code.value, this.options);
        return !exists;
    }

    /**
     * @param {import('../domain/models/offer-name')} name
     * @returns {Promise<boolean>}
     */
    async isUniqueName(name) {
        const exists = await this.repository.existsByName(name.value, this.options);
        return !exists;
    }
}

module.exports = UniqueChecker;
