/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        getFilteredCollection: function getFilteredCollection(options) {

            const filteredCollection = this.forge();
            filteredCollection.query((qb) => {
                console.log("Here is the a: " + qb.toString());
            });

            // Apply model-specific query behavior
            filteredCollection.applyCustomQuery(options);
            filteredCollection.query((qb) => {
                console.log("Here is the b: " + qb.toString());
            });

            // Add Filter behavior
            filteredCollection.applyDefaultAndCustomFilters(options);
            filteredCollection.query((qb) => {
                console.log("Here is the c: " + qb.toString());
            });

            // Apply model-specific search behavior
            filteredCollection.applySearchQuery(options);
            filteredCollection.query((qb) => {
                console.log("Here is the d: " + qb.toString());
            });

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
