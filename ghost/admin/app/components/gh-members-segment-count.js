import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task, taskGroup} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMembersSegmentCountComponent extends Component {
    @service store;
    @service session;
    @service membersCountCache;

    @tracked total = 0;
    @tracked segmentTotal = 0;

    @taskGroup fetchTasks;

    @task({group: 'fetchTasks'})
    *fetchTotalsTask() {
        this.fetchSegmentTotalTask.perform();

        const filter = this.args.enforcedFilter || undefined;
        this.total = yield this.membersCountCache.count({filter});
    }

    @task({group: 'fetchTasks'})
    *fetchSegmentTotalTask() {
        if (!this.args.segment) {
            return this.segmentTotal = 0;
        }

        let filter;

        if (this.args.enforcedFilter) {
            filter = `${this.args.enforcedFilter}+(${this.args.segment})`;
        } else {
            filter = this.args.segment;
        }

        const members = yield this.store.query('member', {limit: 1, filter});
        this.segmentTotal = members.meta.pagination.total;
        this.args.onSegmentCountChange?.(this.segmentTotal);
    }
}
