import {Resource} from 'ember-could-get-used-to-this';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ActivitypubFollowerCountFetcher extends Resource {
    @service activitypub;

    @tracked count = 0;

    get value() {
        return {
            isLoading: this.fetchFollowersTask.isRunning,
            count: this.count
        };
    }

    setup() {
        this.fetchFollowersTask.perform();
    }

    @task
    *fetchFollowersTask() {
        const count = yield this.activitypub.fetchFollowerCount();

        this.count = count;
    }
}
