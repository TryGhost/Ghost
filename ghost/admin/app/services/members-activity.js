import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

const ONE_MINUTE = 1 * 60 * 1000;

export default class MembersActivityService extends Service {
    @service ajax;
    @service ghostPaths;

    _lastFetchedTimeline = null;
    _lastFetchedTimelineLimit = null;

    async fetchTimeline(options = {}) {
        let staleData = this._lastFetchedTimeline && (new Date() - this._lastFetchedTimeline) > ONE_MINUTE;
        let differentLimit = this._lastFetchedTimelineLimit && this._lastFetchedTimelineLimit !== options.limit;

        if (this._fetchTimelineTask.isRunning) {
            return this._fetchTimelineTask.last;
        }

        if (this.events && !staleData && !differentLimit) {
            return this.events;
        }

        return this._fetchTimelineTask.perform(options.limit);
    }

    @task
    *_fetchTimelineTask(limit) {
        this._lastFetchedTimeline = new Date();
        this._lastFetchedTimelineLimit = limit;
        let eventsUrl = this.ghostPaths.url.api('members/events');
        let events = yield this.ajax.request(eventsUrl, {data: {limit}});
        this.events = events;
        return events;
    }
}
