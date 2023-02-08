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

            // TODO: filter options, for example do we care make a distinction about
            //       logged in member on the tags level?
            cacheKey = `get-all-${JSON.stringify(optionsForCacheKey)}`;
            const cachedResult = this.#cache.get(cacheKey);

            if (cachedResult) {
                return cachedResult;
            }
        }

        const dbResult = await this.#getAllDB(options);

        if (this.#cache) {
            this.#cache.set(cacheKey, dbResult);
        }

        return dbResult;
    }
};
