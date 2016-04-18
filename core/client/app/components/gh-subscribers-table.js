import Ember from 'ember';
import Table from 'ember-light-table';

const {computed, observer} = Ember;

export default Ember.Component.extend({
    classNames: ['subscribers-table'],

    subscribers: null,
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

    init() {
        this._super(...arguments);
        this.set('table', new Table(this.get('columns'), this.get('subscribers')));
    },

    // TODO: big performance issue, especially when the subscribers array is
    // replaced due to hidden items in the live array forcing the filtered/sorted
    // CPs to be recalculated
    subscribersChanged: observer('subscribers.[]', function () {
        this.get('table').setRows(this.get('subscribers'));
    }),

    actions: {
        onScrolledToBottom() {
            let loadNextPage = this.get('loadNextPage');

            if (!this.get('isLoading')) {
                loadNextPage();
            }
        }
    }
});
