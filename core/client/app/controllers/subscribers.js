import Ember from 'ember';
import PaginationRoute from 'ghost/mixins/pagination-route';

const {computed} = Ember;
const {sort} = computed;

export default Ember.Controller.extend(PaginationRoute, {

    paginationModel: 'subscriber',
    paginationSettings: {
        limit: 30
    },

    total: 0,

    subscribers: computed(function () {
        return this.store.peekAll('subscriber');
    }),

    filteredSubscribers: computed('subscribers.@each.isNew', function () {
        return this.get('subscribers').filter((subscriber) => {
            return !subscriber.get('isNew');
        });
    }),

    sortedSubscribers: sort('filteredSubscribers', function (a, b) {
        let dateA = a.get('createdAt');
        let dateB = b.get('createdAt');

        // descending order
        if (dateA > dateB) {
            return -1;
        } else if (dateA < dateB) {
            return 1;
        }

        return 0;
    }),

    // capture the total from the server any time we fetch a new page
    didReceivePaginationMeta(meta) {
        if (meta && meta.pagination) {
            this.set('total', meta.pagination.total);
        }
    }
});
