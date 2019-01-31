import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    store: service(),

    meta: null,
    members: null,

    init() {
        this._super(...arguments);
        this.set('members', this.store.peekAll('member'));
    },

    fetchMembers: task(function* () {
        let newFetchDate = new Date();
        let results;

        if (this._hasFetchedAll) {
            // fetch any records modified since last fetch
            results = yield this.store.query('member', {
                limit: 'all',
                filter: `updated_at:>='${this._lastFetchDate.toISOString()}'`
            });
        } else {
            // fetch all records
            results = yield this.store.query('member', {
                limit: 'all'
            });
            this._hasFetchedAll = true;
        }

        this.set('meta', results.meta);
        this._lastFetchDate = newFetchDate;
    })
});
