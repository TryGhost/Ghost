const _ = require('lodash');

module.exports = class TagsPublicRepository {
    /** @type {object} */
    #Tag;

    /** @type {object} */
    #cache;

    /**
     * @param {object} deps
     * @param {object} deps.Tag Bookshelf Model instance of TagPublic
     * @param {object} deps.cache cache instance
     */
    constructor(deps) {
        this.#Tag = deps.Tag;
        this.#cache = deps.cache;
    }

    /**
     * Queries the database for Tag records
     * @param {Object} options model options
     * @returns
     */
    async #getAllDB(options) {
        return this.#Tag.findPage(options);
    }

    /**
     * Gets all tags and caches the returned results
     * @param {Object} options
     * @returns
     */
    async getAll(options) {
        let cacheKey;

        if (this.#cache) {
            // make the cache key smaller and don't include context
            const permittedOptions = this.#Tag.permittedOptions('findPage')
                .filter(option => (option !== 'context'));
            const optionsForCacheKey = _.pick(options, permittedOptions);

            // NOTE: can be more aggressive here with filtering options,
            //       for example, do we care make a distinction for logged
            //       in member on the tags level?
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
