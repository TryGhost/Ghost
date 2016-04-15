import Ember from 'ember';
import Table from 'ember-light-table';

const {computed} = Ember;

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

    actions: {
        onScrolledToBottom() {
            let loadNextPage = this.get('loadNextPage');

            if (!this.get('isLoading')) {
                loadNextPage().then((records) => {
                    this.get('table').addRows(records);
                });
            }
        }
    }
});
