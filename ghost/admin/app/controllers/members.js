import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    queryParams: ['page'],

    meta: null,
    members: null,

    page: computed('meta.pagination.page', function () {
        let page = this.get('meta.pagination.page');

        if (!page || page === 1) {
            return null;
        }

        return page;
    }),

    fetchMembers: task(function* () {
        let results = yield this.store.query('member', {
            page: this.page || 1,
            limit: 15
        });

        this.set('meta', results.meta);
        this.set('members', results);
    })
});
