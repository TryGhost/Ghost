import Ember from 'ember';
import getRequestErrorMessage from 'ghost/utils/ajax';

const {
    Mixin,
    inject: {service}
} = Ember;

let defaultPaginationSettings = {
    page: 1,
    limit: 15
};

export default Mixin.create({
    notifications: service(),

    paginationModel: null,
    paginationSettings: null,
    paginationMeta: null,

    init() {
        let paginationSettings = this.get('paginationSettings');
        let settings = Ember.$.extend({}, defaultPaginationSettings, paginationSettings);

        this._super(...arguments);
        this.set('paginationSettings', settings);
        this.set('paginationMeta', {});
    },

    /**
     * Takes an ajax response, concatenates any error messages, then generates an error notification.
     * @param {jqXHR} response The jQuery ajax reponse object.
     * @return
     */
    reportLoadError(response) {
        let message = 'A problem was encountered while loading more records';

        if (response) {
            // Get message from response
            message += `: ${getRequestErrorMessage(response, true)}`;
        } else {
            message += '.';
        }

        this.get('notifications').showAlert(message, {type: 'error', key: 'pagination.load.failed'});
    },

    loadFirstPage() {
        let paginationSettings = this.get('paginationSettings');
        let modelName = this.get('paginationModel');

        paginationSettings.page = 1;

        return this.get('store').query(modelName, paginationSettings).then((results) => {
            this.set('paginationMeta', results.meta);
            return results;
        }, (response) => {
            this.reportLoadError(response);
        });
    },

    actions: {
        loadFirstPage() {
            return this.loadFirstPage();
        },

        /**
         * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
         * @return
         */
        loadNextPage() {
            let store = this.get('store');
            let modelName = this.get('paginationModel');
            let metadata = this.get('paginationMeta');
            let nextPage = metadata.pagination && metadata.pagination.next;
            let paginationSettings = this.get('paginationSettings');

            if (nextPage) {
                this.set('isLoading', true);
                this.set('paginationSettings.page', nextPage);

                store.query(modelName, paginationSettings).then((results) => {
                    this.set('isLoading', false);
                    this.set('paginationMeta', results.meta);
                    return results;
                }, (response) => {
                    this.reportLoadError(response);
                });
            }
        },

        resetPagination() {
            this.set('paginationSettings.page', 1);
        }
    }
});
