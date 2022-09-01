import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMembersFilterCountComponent extends Component {
    @service membersCountCache;

    @tracked memberCount;

    constructor() {
        super(...arguments);
        this.getMembersCountTask.perform();
    }

    @task
    *getMembersCountTask() {
        this.memberCount = yield this.membersCountCache.countString(
            this.args.filter,
            {knownCount: this.args.knownCount, newsletter: this.args.newsletter}
        );
    }
}
