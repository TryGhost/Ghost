import Ember from 'ember';
import getRequestErrorMessage from 'ghost-admin/utils/ajax';

const {
    Mixin,
    computed,
    RSVP,
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

    // add a hook so that routes/controllers can do something with the meta data
    paginationMeta: computed({
        get() {
            return this._paginationMeta;
        },
        set(key, value) {
            if (this.didReceivePaginationMeta) {
                this.didReceivePaginationMeta(value);
            }
            this._paginationMeta = value;
            return value;
        }
    }),

    init() {
        let paginationSettings = this.get('paginationSettings');
        let settings = Ember.assign({}, defaultPaginationSettings, paginationSettings);

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

        this.set('paginationSettings.page', 1);

        this.set('isLoading', true);

        return this.get('store').query(modelName, paginationSettings).then((results) => {
            this.set('paginationMeta', results.meta);
            return results;
        }).catch((response) => {
            this.reportLoadError(response);
        }).finally(() => {
            this.set('isLoading', false);
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

            if (nextPage && !this.get('isLoading')) {
                this.set('isLoading', true);
                this.set('paginationSettings.page', nextPage);

                return store.query(modelName, paginationSettings).then((results) => {
                    this.set('paginationMeta', results.meta);
                    return results;
                }).catch((response) => {
                    this.reportLoadError(response);
                }).finally(() => {
                    this.set('isLoading', false);
                });
            } else {
                return RSVP.resolve([]);
            }
        },

        resetPagination() {
            this.set('paginationSettings.page', 1);
        }
    }
});
