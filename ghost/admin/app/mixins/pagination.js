import Mixin from '@ember/object/mixin';
import RSVP from 'rsvp';
import {assign} from '@ember/polyfills';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

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
        // don't merge defaults if paginationSettings is a CP
        if (!this.paginationSettings.isDescriptor) {
            let paginationSettings = this.get('paginationSettings');
            let settings = assign({}, defaultPaginationSettings, paginationSettings);

            this.set('paginationSettings', settings);
        }

        this.set('paginationMeta', {});

        this._super(...arguments);
    },

    reportLoadError(error) {
        this.get('notifications').showAPIError(error, {key: 'pagination.load.failed'});
    },

    loadFirstPage(transition) {
        let paginationSettings = this.get('paginationSettings');
        let modelName = this.get('paginationModel');

        this.set('paginationSettings.page', 1);

        this.set('isLoading', true);

        return this.get('store').query(modelName, paginationSettings).then((results) => {
            this.set('paginationMeta', results.meta);
            return results;
        }).catch((error) => {
            // if we have a transition we're executing in a route hook so we
            // want to throw in order to trigger the global error handler
            if (transition) {
                throw error;
            } else {
                this.reportLoadError(error);
            }
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
                }).catch((error) => {
                    this.reportLoadError(error);
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
