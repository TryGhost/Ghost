import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersStatsService extends Service {
    @service ajax;
    @service ghostPaths;

    @tracked days = '30';
    @tracked stats = null;
    @tracked events = null;

    fetch() {
        let daysChanged = this._lastFetchedDays !== this.days;
        let staleData = this._lastFetched && this._lastFetched - new Date() > 1 * 60 * 1000;

        // return an already in-progress promise unless params have changed
        if (this._fetchTask.isRunning && !this._forceRefresh && !daysChanged) {
            return this._fetchTask.last;
        }

        // return existing stats unless data is > 1 min old
        if (this.stats && !this._forceRefresh && !daysChanged && !staleData) {
            return Promise.resolve(this.stats);
        }

        return this._fetchTask.perform();
    }

    fetchTimeline() {
        let staleData = this._lastFetchedTimeline && this._lastFetchedTimeline - new Date() > 1 * 60 * 1000;

        if (this._fetchTimelineTask.isRunning) {
            return this._fetchTask.last;
        }

        if (this.events && !this._forceRefresh && !staleData) {
            return Promise.resolve(this.events);
        }

        return this._fetchTimelineTask.perform();
    }

    invalidate() {
        this._forceRefresh = true;
    }

    @task
    *_fetchTask() {
        let {days} = this;

        this._lastFetchedDays = days;
        this._lastFetched = new Date();
        this._forceRefresh = false;

        let statsUrl = this.ghostPaths.url.api('members/stats');
        let stats = yield this.ajax.request(statsUrl, {data: {days}});
        this.stats = stats;
        return stats;
    }

    @task
    *_fetchTimelineTask() {
        this._lastFetchedTimeline = new Date();
        let eventsUrl = this.ghostPaths.url.api('members/events');
        let events = yield this.ajax.request(eventsUrl);
        this.events = events;
        return events;
    }
}
