const _ = require('lodash');

module.exports = class PublicResourcesRepository {
    /** @type {object} */
    #Model;

    /** @type {object} */
    #cache;

    /**
     * @param {object} deps
     * @param {object} deps.Model Bookshelf Model instance of TagPublic/Post/Author etc.
     * @param {object} deps.cache cache instance
     */
    constructor(deps) {
        this.#Model = deps.Model;
        this.#cache = deps.cache;
    }

    /**
     * Queries the database for model records
     * @param {Object} options model options
     * @returns
     */
    async #getAllDB(options) {
        return this.#Model.findPage(options);
    }

    /**
     * Retrieves all records from the storage (cache or database)
     * @param {Object} options
     * @returns
     */
    async getAll(options) {
        let cacheKey;

        if (this.#cache) {
            // make the cache key smaller and don't include context
            const permittedOptions = this.#Model.permittedOptions('findPage')
                .filter(option => (option !== 'context'));
            const optionsForCacheKey = _.pick(options, permittedOptions);

            // NOTE: can be more aggressive here with filtering options,
            //       for example, do we care make a distinction for logged
            //       in member on the repository level?
            cacheKey = `get-all-${JSON.stringify(optionsForCacheKey)}`;
            const cachedResult = await this.#cache.get(cacheKey);

            // NOTE: if the cache result is empty still going to the DB
            //       this check can be removed if we want to be more aggressive
            //       with caching and avoid and extra DB call
            if (cachedResult) {
                return cachedResult;
            }
        }

        const dbResult = await this.#getAllDB(options);

        if (this.#cache) {
            await this.#cache.set(cacheKey, dbResult);
        }

        return dbResult;
    }
};
