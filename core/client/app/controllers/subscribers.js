import Ember from 'ember';
import Table from 'ember-light-table';
import PaginationMixin from 'ghost/mixins/pagination';

const {computed} = Ember;

export default Ember.Controller.extend(PaginationMixin, {

    paginationModel: 'subscriber',
    paginationSettings: {
        limit: 30
    },

    total: 0,
    table: null,

    columns: computed(function () {
        return [{
            label: 'Subscriber',
            valuePath: 'email'
        }, {
            label: 'Subscription Date',
            valuePath: 'createdAt',
            format(value) {
                return value.format('MMMM DD, YYYY');
            }
        }, {
            label: 'Status',
            valuePath: 'status'
        }];
    }),

    initializeTable() {
        this.set('table', new Table(this.get('columns'), this.get('subscribers')));
    },

    // capture the total from the server any time we fetch a new page
    didReceivePaginationMeta(meta) {
        if (meta && meta.pagination) {
            this.set('total', meta.pagination.total);
        }
    },

    actions: {
        loadFirstPage() {
            let table = this.get('table');

            return this._super(...arguments).then((results) => {
                table.addRows(results);
                return results;
            });
        },

        loadNextPage() {
            let table = this.get('table');

            return this._super(...arguments).then((results) => {
                table.addRows(results);
                return results;
            });
        },

        addSubscriber(subscriber) {
            this.get('table').insertRowAt(0, subscriber);
            this.incrementProperty('total');
        },

        reset() {
            this.get('table').setRows([]);
            this.send('loadFirstPage');
        }
    }
});
