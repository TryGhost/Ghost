import moment from 'moment-timezone';
import {Resource} from 'ember-could-get-used-to-this';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const actions = {
    showPrevious: 'showPrevious',
    showNext: 'showNext'
};

export default class MembersEventsFetcher extends Resource {
    @service ajax;
    @service ghostPaths;
    @service store;

    @tracked data = new TrackedArray([]);
    @tracked isLoading = false;
    @tracked isError = false;
    @tracked errorMessage = null;

    @tracked hasReachedStart = true;
    @tracked hasReachedEnd = true;

    @tracked shownEvents = 0;
    @tracked totalEvents = 0;

    // save last event's date of each page for easy navigation to previous page
    @tracked eventsBookmarks = [];

    get value() {
        return {
            isLoading: this.isLoading,
            isError: this.isError,
            errorMessage: this.errorMessage,
            data: this.data,
            loadNextPage: this.loadNextPage,
            loadPreviousPage: this.loadPreviousPage,
            hasReachedStart: this.hasReachedStart,
            hasReachedEnd: this.hasReachedEnd,
            totalEvents: this.totalEvents,
            shownEvents: this.shownEvents,
            previousEvents: this.getAmountOfPreviousEvents()
        };
    }

    getAmountOfPreviousEvents() {
        return this.shownEvents - this.data.length + 1;
    }

    async setup() {
        const currentTime = moment.utc().format('YYYY-MM-DD HH:mm:ss');
        let filter = `data.created_at:<'${currentTime}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        this.eventsBookmarks.push(currentTime);
        await this.loadEventsTask.perform({filter}, actions.showNext);
    }

    @action
    loadNextPage() {
        const lastEvent = this.data[this.data.length - 1];
        const lastEventDate = moment.utc(lastEvent.data.created_at).format('YYYY-MM-DD HH:mm:ss');
        let filter = `data.created_at:<'${lastEventDate}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        this.eventsBookmarks.push(lastEventDate);
        this.loadEventsTask.perform({filter}, actions.showNext);
    }

    @action
    loadPreviousPage() {
        this.eventsBookmarks.pop();
        let filter = `data.created_at:<'${this.eventsBookmarks[this.eventsBookmarks.length - 1]}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        this.shownEvents = this.shownEvents - this.data.length;

        this.loadEventsTask.perform({filter}, actions.showPrevious);
    }

    updateState(meta, actionType) {
        if (!this.data.length) {
            return;
        }

        if (!this.totalEvents) {
            this.totalEvents = meta.pagination.total;
        }

        if (actionType === actions.showNext) {
            this.shownEvents = this.shownEvents + this.data.length;
        }

        this.hasReachedStart = this.totalEvents === meta.pagination.total;
        this.hasReachedEnd = this.shownEvents === this.totalEvents;

        // todo: it's temporarily fix, pagination breaks if few events happen at the same time, easy to reproduce on email clicks
        if ((this.shownEvents < this.totalEvents) && (this.data.length < this.args.named.pageSize)) {
            this.hasReachedEnd = true;
        }
    }

    @task
    *loadEventsTask(queryParams, actionType) {
        try {
            this.isLoading = true;

            const url = this.ghostPaths.url.api('members/events');
            const data = Object.assign({}, queryParams, {limit: this.args.named.pageSize});
            const {events, meta} = yield this.ajax.request(url, {data});

            this.data = events;
            this.updateState(meta, actionType);
        } catch (e) {
            this.isError = true;

            const errorMessage = e.payload?.errors?.[0]?.message;
            if (errorMessage) {
                this.errorMessage = errorMessage;
            }

            // TODO: log to Sentry
            console.error(e); // eslint-disable-line
        } finally {
            this.isLoading = false;
        }
    }
}
