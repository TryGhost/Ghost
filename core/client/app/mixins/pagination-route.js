import Ember from 'ember';
import getRequestErrorMessage from 'ghost/utils/ajax';

var defaultPaginationSettings = {
    page: 1,
    limit: 15
};

export default Ember.Mixin.create({
    notifications: Ember.inject.service(),

    paginationModel: null,
    paginationSettings: null,
    paginationMeta: null,

    init: function () {
        var paginationSettings = this.get('paginationSettings'),
            settings = Ember.$.extend({}, defaultPaginationSettings, paginationSettings);

        this._super(...arguments);
        this.set('paginationSettings', settings);
        this.set('paginationMeta', {});
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

        this.get('notifications').showAlert(message, {type: 'error', key: 'pagination.load.failed'});
    },

    loadFirstPage: function () {
        var paginationSettings = this.get('paginationSettings'),
            modelName = this.get('paginationModel'),
            self = this;

        paginationSettings.page = 1;

        return this.get('store').query(modelName, paginationSettings).then(function (results) {
            self.set('paginationMeta', results.meta);
            return results;
        }, function (response) {
            self.reportLoadError(response);
        });
    },

    actions: {
        loadFirstPage: function () {
            return this.loadFirstPage();
        },

        /**
         * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
         * @return
         */
        loadNextPage: function () {
            var self = this,
                store = this.get('store'),
                modelName = this.get('paginationModel'),
                metadata = this.get('paginationMeta'),
                nextPage = metadata.pagination && metadata.pagination.next,
                paginationSettings = this.get('paginationSettings');

            if (nextPage) {
                this.set('isLoading', true);
                this.set('paginationSettings.page', nextPage);

                store.query(modelName, paginationSettings).then(function (results) {
                    self.set('isLoading', false);
                    self.set('paginationMeta', results.meta);
                    return results;
                }, function (response) {
                    self.reportLoadError(response);
                });
            }
        },

        resetPagination: function () {
            this.set('paginationSettings.page', 1);
        }
    }
});
