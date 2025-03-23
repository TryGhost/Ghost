const errors = require('@tryghost/errors');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        /**
         * Return a relation, and load it if it hasn't been loaded already (or force a refresh with the forceRefresh option).
         * refs https://github.com/TryGhost/Team/issues/1626
         * @param {string} name Name of the relation to load
         * @param {Object} [options] Options to pass to the fetch when not yet loaded (or when force refreshing)
         * @param {boolean} [options.forceRefresh] If true, the relation will be fetched again even if it has already been loaded.
         * @param {boolean} [options.require] Off by default. Throws an error if relation is not found.
         * @returns {Promise<import('bookshelf').Model|import('bookshelf').Collection|null>}
         */
        getLazyRelation: async function (name, options = {}) {
            if (this.relations[name] && !options.forceRefresh) {
                // Relation was already loaded
                return this.relations[name];
            }

            if (!this[name]) {
                if (options.require) {
                    throw new errors.NotFoundError();
                }
                return undefined;
            }

            // Explicitly set require to false if it's not set, because default for .fetch is true (not false)
            if (options.require) {
                options.require = true;
            } else {
                options.require = false;
            }

            // Not yet loaded, or force refresh
            // Note that we don't use .refresh on the relation on options.forceRefresh
            // Because the relation can also be a collection, which doesn't have a refresh method
            const instance = this[name]();
            await instance.fetch(options);

            if (!instance.id && !(instance instanceof Bookshelf.Collection)) {
                // Some weird behaviour in Bookshelf allows to just return a newly created model instance instead of throwing an error
                if (options.require) {
                    throw new errors.NotFoundError();
                }
                return undefined;
            }
            this.relations[name] = instance;
            return instance;
        }
    });
};
