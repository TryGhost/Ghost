import {Resource} from 'ember-could-get-used-to-this';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

// DEMO ONLY: mirror of FIXTURE_RECIPIENT_COUNT in the React analytics
// prototype (prototype-analytics-status/prototype-context.ts). While the
// prototype's variant E is active, every publish-flow surface this fetcher
// feeds quotes the same fixture-sized audience as the analytics page the
// flow hands over to — otherwise the confirm step says 346 and the page
// seconds later says 547,120.
const DEMO_FIXTURE_RECIPIENT_COUNT = 547120;

function demoFixtureCount() {
    try {
        const stored = JSON.parse(localStorage.getItem('ghost-prototype-analytics-status') || '{}');
        return ['gatedUntilSent', 'deliveryRing', 'sentAsDenominator'].includes(stored.variant) ? DEMO_FIXTURE_RECIPIENT_COUNT : null;
    } catch (e) {
        return null;
    }
}

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
        this.count = demoFixtureCount() ?? count;
    }
}
