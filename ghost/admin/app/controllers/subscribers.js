import $ from 'jquery';
import Controller from '@ember/controller';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const orderMap = {
    email: 'email',
    created_at: 'createdAtUTC',
    status: 'status'
};

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    session: service(),

    queryParams: ['order', 'direction'],
    order: 'created_at',
    direction: 'desc',

    subscribers: null,
    subscriberToDelete: null,

    init() {
        this._super(...arguments);
        this.set('subscribers', this.store.peekAll('subscriber'));
    },

    filteredSubscribers: computed('subscribers.@each.{email,createdAtUTC}', function () {
        return this.subscribers.toArray().filter((subscriber) => {
            return !subscriber.isNew && !subscriber.isDeleted;
        });
    }),

    sortedSubscribers: computed('order', 'direction', 'subscribers.@each.{email,createdAtUTC,status}', function () {
        let {filteredSubscribers, order, direction} = this;

        let sorted = filteredSubscribers.sort((a, b) => {
            let values = [a.get(orderMap[order]), b.get(orderMap[order])];

            if (direction === 'desc') {
                values = values.reverse();
            }

            if (typeof values[0] === 'string') {
                return values[0].localeCompare(values[1], undefined, {ignorePunctuation: true});
            }

            if (typeof values[0] === 'object' && values[0]._isAMomentObject) {
                return values[0].valueOf() - values[1].valueOf();
            }

            return values[0] - values[1];
        });

        return sorted;
    }),

    actions: {
        deleteSubscriber(subscriber) {
            this.set('subscriberToDelete', subscriber);
        },

        confirmDeleteSubscriber() {
            let subscriber = this.subscriberToDelete;

            return subscriber.destroyRecord().then(() => {
                this.set('subscriberToDelete', null);
            });
        },

        cancelDeleteSubscriber() {
            this.set('subscriberToDelete', null);
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
    },

    fetchSubscribers: task(function* () {
        let newFetchDate = new Date();
        let results;

        if (this._hasFetchedAll) {
            // fetch any records modified since last fetch
            results = yield this.store.query('subscriber', {
                limit: 'all',
                filter: `updated_at:>='${moment.utc(this._lastFetchDate).format('YYYY-MM-DD HH:mm:ss')}'`
            });
        } else {
            // fetch all records in batches of 200
            while (!results || results.meta.pagination.page < results.meta.pagination.pages) {
                results = yield this.store.query('subscriber', {
                    limit: 200,
                    order: `${this.order} ${this.direction}`,
                    page: results ? results.meta.pagination.page + 1 : 1
                });
            }
            this._hasFetchedAll = true;
        }

        this._lastFetchDate = newFetchDate;
    })
});
