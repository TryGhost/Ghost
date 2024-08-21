/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        getFilteredCollection: function getFilteredCollection(options) {
            const filteredCollection = this.forge();

            // Apply model-specific query behavior
            filteredCollection.applyCustomQuery(options);

            // Add Filter behavior
            filteredCollection.applyDefaultAndCustomFilters(options);

            // Apply model-specific search behavior
            filteredCollection.applySearchQuery(options);

            return filteredCollection;
        },

        getFilteredCollectionQuery: function getFilteredCollectionQuery(options) {
            const filteredCollection = this.getFilteredCollection(options);
            const filteredCollectionQuery = filteredCollection.query();

            if (options.transacting) {
                filteredCollectionQuery.transacting(options.transacting);
                if (options.forUpdate) {
                    filteredCollectionQuery.forUpdate();
                }
            }

            return filteredCollectionQuery;
        }
    });
};
