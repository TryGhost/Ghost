import { getRequestErrorMessage } from 'ghost/utils/ajax';

var PostsController = Ember.ArrayController.extend({
    // this will cause the list to re-sort when any of these properties change on any of the models
    sortProperties: ['status', 'published_at', 'updated_at'],

    // override Ember.SortableMixin
    //
    // this function will keep the posts list sorted when loading individual/bulk
    // models from the server, even if records in between haven't been loaded.
    // this can happen when reloading the page on the Editor or PostsPost routes.
    //
    // a custom sort function is needed in order to sort the posts list the same way the server would:
    //     status: ASC
    //     published_at: DESC
    //     updated_at: DESC
    orderBy: function (item1, item2) {
        var status1 = item1.get('status'),
            status2 = item2.get('status'),

            updatedAt1, updatedAt2,
            publishedAt1, publishedAt2;

        if (status1 === status2) {
            if (status1 === 'draft') {
                updatedAt1 = item1.get('updated_at');
                updatedAt2 = item2.get('updated_at');

                return (new Date(updatedAt1)) < (new Date(updatedAt2)) ? 1 : -1;
            } else {
                publishedAt1 = item1.get('published_at');
                publishedAt2 = item2.get('published_at');

                return (new Date(publishedAt1)) < new Date(publishedAt2) ? 1 : -1;
            }
        }

        if (status2 === 'draft') {
            return 1;
        }

        return -1;
    },

    // set from PostsRoute
    paginationSettings: null,

    // holds the next page to load during infinite scroll
    nextPage: null,

    // indicates whether we're currently loading the next page
    isLoading: null,

    init: function () {
        this._super();

        var metadata = this.store.metadataFor('post');
        this.set('nextPage', metadata.pagination.next);
    },

    /**
     * Takes an ajax response, concatenates any error messages, then generates an error notification.
     * @param {jqXHR} response The jQuery ajax reponse object.
     * @return
     */
    reportLoadError: function (response) {
        var message = 'A problem was encountered while loading more posts';

        if (response) {
            // Get message from response
            message += ': ' + getRequestErrorMessage(response);
        } else {
            message += '.';
        }

        this.notifications.showError(message);
    },

    actions: {
        /**
        * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
        * @return
        */
        loadNextPage: function () {
            var self = this,
                store = this.get('store'),
                nextPage = this.get('nextPage'),
                paginationSettings = this.get('paginationSettings');

            if (nextPage) {
                this.set('isLoading', true);
                this.set('paginationSettings.page', nextPage);
                store.find('post', paginationSettings).then(function () {
                    var metadata = store.metadataFor('post');

                    self.set('nextPage', metadata.pagination.next);
                    self.set('isLoading', false);
                }, function (response) {
                    self.reportLoadError(response);
                });
            }
        }
    }
});

export default PostsController;
