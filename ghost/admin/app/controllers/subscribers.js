import $ from 'jquery';
import {assign} from 'ember-platform';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import Controller from 'ember-controller';

import Table from 'ember-light-table';
import PaginationMixin from 'ghost-admin/mixins/pagination';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

export default Controller.extend(PaginationMixin, {

    queryParams: ['order', 'direction'],
    order: 'created_at',
    direction: 'desc',

    paginationModel: 'subscriber',

    total: 0,
    table: null,
    subscriberToDelete: null,

    session: injectService(),

    // paginationSettings is replaced by the pagination mixin so we need a
    // getter/setter CP here so that we don't lose the dynamic order param
    paginationSettings: computed('order', 'direction', {
        get() {
            let order = this.get('order');
            let direction = this.get('direction');

            let currentSettings = this._paginationSettings || {
                limit: 30
            };

            return assign({}, currentSettings, {
                order: `${order} ${direction}`
            });
        },
        set(key, value) {
            this._paginationSettings = value;
            return value;
        }
    }),

    columns: computed('order', 'direction', function () {
        let order = this.get('order');
        let direction = this.get('direction');

        return [{
            label: 'Subscriber',
            valuePath: 'email',
            sorted: order === 'email',
            ascending: direction === 'asc'
        }, {
            label: 'Subscription Date',
            valuePath: 'createdAtUTC',
            format(value) {
                return value.format('MMMM DD, YYYY');
            },
            sorted: order === 'created_at',
            ascending: direction === 'asc'
        }, {
            label: 'Status',
            valuePath: 'status',
            sorted: order === 'status',
            ascending: direction === 'asc'
        }, {
            label: '',
            sortable: false,
            cellComponent: 'gh-subscribers-table-delete-cell',
            align: 'right'
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

        sortByColumn(column) {
            let table = this.get('table');

            if (column.sorted) {
                this.setProperties({
                    order: column.get('valuePath').trim().replace(/UTC$/, '').underscore(),
                    direction: column.ascending ? 'asc' : 'desc'
                });
                table.setRows([]);
                this.send('loadFirstPage');
            }
        },

        addSubscriber(subscriber) {
            this.get('table').insertRowAt(0, subscriber);
            this.incrementProperty('total');
        },

        deleteSubscriber(subscriber) {
            this.set('subscriberToDelete', subscriber);
        },

        confirmDeleteSubscriber() {
            let subscriber = this.get('subscriberToDelete');

            return subscriber.destroyRecord().then(() => {
                this.set('subscriberToDelete', null);
                this.get('table').removeRow(subscriber);
                this.decrementProperty('total');
            });
        },

        cancelDeleteSubscriber() {
            this.set('subscriberToDelete', null);
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
