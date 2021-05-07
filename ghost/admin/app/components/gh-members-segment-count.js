import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task, taskGroup} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class GhMembersSegmentCountComponent extends Component {
    @service store;
    @service session;

    @tracked total = 0;
    @tracked segmentTotal = 0;

    @taskGroup fetchTasks;

    @task({group: 'fetchTasks'})
    *fetchTotalsTask() {
        this.fetchSegmentTotalTask.perform();

        const members = yield this.store.query('member', {limit: 1});
        this.total = members.meta.pagination.total;
    }

    @task({group: 'fetchTasks'})
    *fetchSegmentTotalTask() {
        if (!this.args.segment) {
            return this.segmentTotal = 0;
        }

        const members = yield this.store.query('member', {limit: 1, filter: this.args.segment});
        this.segmentTotal = members.meta.pagination.total;
    }
}
