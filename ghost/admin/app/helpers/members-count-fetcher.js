import {Resource} from 'ember-could-get-used-to-this';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class MembersCount extends Resource {
    @service membersCountCache;
    @service session;

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
        // Only roles with permissions to manage members should fetch a count
        // For other roles simply leave it as `null` so templates can react accordingly
        if (!this.session.user.canManageMembers) {
            this.count = null;
            return;
        }

        const count = yield this.membersCountCache.count(query);
        this.count = count;
    }
}
