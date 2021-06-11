import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class GhRecipientFilterCountComponent extends Component {
    @service membersCountCache;

    @tracked recipientCount;

    constructor() {
        super(...arguments);
        this.getRecipientCountTask.perform();
    }

    @task
    *getRecipientCountTask() {
        if (!this.args.filter) {
            this.recipientCount = 'no members';
            return;
        }

        this.recipientCount = yield this.membersCountCache.countString(
            `subscribed:true+(${this.args.filter})`,
            {knownCount: this.args.knownCount}
        );
    }
}
