import Controller from '@ember/controller';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    store: service(),

    meta: null,
    members: null,
    searchText: '',

    init() {
        this._super(...arguments);
        this.set('members', this.store.peekAll('member'));
    },

    filteredMembers: computed('members.@each.{name,email}', 'searchText', function () {
        let {members, searchText} = this;
        searchText = searchText.toLowerCase();

        let filtered = members.filter((member) => {
            if (!searchText) {
                return true;
            }

            let {name, email} = member;
            return name.toLowerCase().indexOf(searchText) >= 0
                || email.toLowerCase().indexOf(searchText) >= 0;
        });

        return filtered;
    }),

    fetchMembers: task(function* () {
        let newFetchDate = new Date();
        let results;

        if (this._hasFetchedAll) {
            // fetch any records modified since last fetch
            results = yield this.store.query('member', {
                limit: 'all',
                filter: `updated_at:>='${moment.utc(this._lastFetchDate).format('YYYY-MM-DD HH:mm:ss')}'`
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
