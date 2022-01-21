import Service, {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
export default class MembersActivityService extends Service {
    @service ajax;
    @service ghostPaths;

    async fetch(options = {}) {
        return this._fetchTask.perform(options);
    }

    @task
    *fetchTask({limit, filter}) {
        const eventsUrl = this.ghostPaths.url.api('members/events');
        const events = yield this.ajax.request(eventsUrl, {data: {limit, filter}});

        return events;
    }
}
