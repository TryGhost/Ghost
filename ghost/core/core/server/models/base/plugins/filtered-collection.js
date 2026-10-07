const _ = require('lodash');
const { hasPosts } = require('@tryghost/bookshelf-plugins');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
  Bookshelf.Model = Bookshelf.Model.extend(
    {},
    {
      getFilteredCollection: function getFilteredCollection(options) {
        const filteredCollection = this.forge();

        // Apply model-specific query behavior
        filteredCollection.applyCustomQuery(options);

        // Add Filter behavior
        filteredCollection.applyDefaultAndCustomFilters(options);

        // Apply model-specific search behavior
        filteredCollection.applySearchQuery(options);

        // Authors are hidden unless they have posts. Apply that constraint before
        // fetchPage clones its count query so pagination cannot reveal hidden staff.
        // Keep this author-specific: tags have separate, established count semantics.
        if (filteredCollection.shouldHavePosts?.joinTable === 'posts_authors') {
          filteredCollection.query(
            hasPosts.addHasPostsWhere(
              _.result(filteredCollection, 'tableName'),
              filteredCollection.shouldHavePosts,
            ),
          );
          filteredCollection.shouldHavePosts = null;
        }

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
      },
    },
  );
};
