import {Resource} from 'ember-could-get-used-to-this';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class MembersCount extends Resource {
    @service store;

    @tracked count = null;

    get value() {
        return {
            isLoading: this.fetchMembersTask.isRunning,
            count: this.count
        };
    }

    setup() {
        const query = this.args.named.query || {};
        this._query = query;
        this.fetchMembersTask.perform({query});
    }

    update() {
        // required due to a weird invalidation issue when using Ember Data with ember-could-get-used-to-this
        // TODO: re-test after upgrading to ember-resources
        if (this.args.named.query !== this._query) {
            const query = this.args.named.query || {};
            this._query = query;
            this.fetchMembersTask.perform({query});
        }
    }

    @task
    *fetchMembersTask({query} = {}) {
        const result = yield this.store.query('member', {...query, limit: 1});
        this.count = result.meta.pagination.total;
    }
}
