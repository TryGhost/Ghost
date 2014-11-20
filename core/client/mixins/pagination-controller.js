import { getRequestErrorMessage } from 'ghost/utils/ajax';

var PaginationControllerMixin = Ember.Mixin.create({
    // set from PaginationRouteMixin
    paginationSettings: null,

    // holds the next page to load during infinite scroll
    nextPage: null,

    // indicates whether we're currently loading the next page
    isLoading: null,

    /**
     *
     * @param {object} options: {
     *                      modelType: <String> name of the model that will be paginated
     *                  }
     */
    init: function (options) {
        this._super(options);

        var metadata = this.store.metadataFor(options.modelType);

        this.set('nextPage', metadata.pagination.next);
    },

    /**
     * Takes an ajax response, concatenates any error messages, then generates an error notification.
     * @param {jqXHR} response The jQuery ajax reponse object.
     * @return
     */
    reportLoadError: function (response) {
        var message = 'A problem was encountered while loading more records';

        if (response) {
            // Get message from response
            message += ': ' + getRequestErrorMessage(response, true);
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
                recordType = this.get('model').get('type'),
                nextPage = this.get('nextPage'),
                paginationSettings = this.get('paginationSettings');

            if (nextPage) {
                this.set('isLoading', true);
                this.set('paginationSettings.page', nextPage);

                store.find(recordType, paginationSettings).then(function () {
                    var metadata = store.metadataFor(recordType);

                    self.set('nextPage', metadata.pagination.next);
                    self.set('isLoading', false);
                }, function (response) {
                    self.reportLoadError(response);
                });
            }
        }
    }
});

export default PaginationControllerMixin;
