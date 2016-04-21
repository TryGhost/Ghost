import Ember from 'ember';
import Table from 'ember-light-table';
import PaginationMixin from 'ghost/mixins/pagination';
import ghostPaths from 'ghost/utils/ghost-paths';

const {
    $,
    computed,
    inject: {service}
} = Ember;

export default Ember.Controller.extend(PaginationMixin, {

    paginationModel: 'subscriber',
    paginationSettings: {
        limit: 30
    },

    total: 0,
    table: null,

    session: service(),

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
        },

        exportData() {
            let exportUrl = ghostPaths().url.api('subscribers/csv');
            let accessToken = this.get('session.data.authenticated.access_token');
            let downloadURL = `${exportUrl}?access_token=${accessToken}`;
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        }
    }
});
