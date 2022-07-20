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
         * @returns {Promise<import('bookshelf').Model|import('bookshelf').Collection|null>}
         */
        getLazyRelation: async function (name, options = {}) {
            if (this.relations[name] && !options.forceRefresh) {
                // Relation was already loaded
                return this.relations[name];
            }

            if (!this[name]) {
                return undefined;
            }
            // Not yet loaded, or force refresh
            // Note that we don't use .refresh on the relation on options.forceRefresh
            // Because the relation can also be a collection, which doesn't have a refresh method
            this.relations[name] = this[name]();
            return this.relations[name].fetch(options);
        }
    });
};
