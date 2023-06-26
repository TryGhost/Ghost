import moment from 'moment-timezone';
import {Resource} from 'ember-could-get-used-to-this';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {didCancel, task} from 'ember-concurrency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class HistoryEventFetcher extends Resource {
    @service ajax;
    @service ghostPaths;
    @service store;

    @tracked data = new TrackedArray([]);
    @tracked isLoading = false;
    @tracked isError = false;
    @tracked errorMessage = null;
    @tracked hasReachedEnd = false;

    cursor = null;

    get value() {
        return {
            isLoading: this.isLoading,
            isError: this.isError,
            errorMessage: this.errorMessage,
            data: this.data,
            loadNextPage: this.loadNextPage,
            hasReachedEnd: this.hasReachedEnd
        };
    }

    async setup() {
        this.cursor = moment.utc().format('YYYY-MM-DD HH:mm:ss');
        let filter = `created_at:<'${this.cursor}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        try {
            await this.loadEventsTask.perform({filter});
        } catch (e) {
            if (!didCancel(e)) {
                // re-throw the non-cancelation error
                throw e;
            }
        }
    }

    @action
    loadNextPage() {
        // NOTE: assumes data is always ordered by created_at desc
        const lastEvent = this.data[this.data.length - 1];

        if (!lastEvent?.created_at) {
            this.hasReachedEnd = true;
            return;
        }

        const cursor = moment.utc(lastEvent.created_at).format('YYYY-MM-DD HH:mm:ss');

        if (cursor === this.cursor) {
            this.hasReachedEnd = true;
            return;
        }

        this.cursor = cursor;
        let filter = `created_at:<'${this.cursor}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        this.loadEventsTask.perform({filter});
    }

    @task
    *loadEventsTask(queryParams) {
        try {
            this.isLoading = true;

            const url = this.ghostPaths.url.api('actions');
            const data = Object.assign({}, queryParams, {
                include: 'actor,resource',
                limit: this.args.named.pageSize
            });
            const {actions} = yield this.ajax.request(url, {data});

            if (actions.length < data.limit) {
                this.hasReachedEnd = true;
            }

            let count = 1;

            actions.reverse().forEach((a, index) => {
                const nextAction = actions[index + 1] || null;

                // depending on the similarity, add additional properties to be used on the frontend for grouping
                // skip - used for hiding the event on the frontend
                // count - the number of similar events which is added to the last item
                if (nextAction || (!nextAction && actions[index - 1].skip)) {
                    if (nextAction && a.resource_id === nextAction.resource_id && a.event === nextAction.event) {
                        a.skip = true;
                        count += 1;
                    } else {
                        if (count > 1) {
                            a.count = count.toString();
                            count = 1;
                        }
                    }
                }

                a.context = JSON.parse(a.context);
            });

            this.data.push(...actions.reverse());
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
