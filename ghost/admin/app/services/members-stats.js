import Service, {inject as service} from '@ember/service';
import moment from 'moment';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const ONE_MINUTE = 1 * 60 * 1000;

export default class MembersStatsService extends Service {
    @service ajax;
    @service ghostPaths;
    @service store;

    @tracked days = '30';
    @tracked stats = null;
    @tracked events = null;
    @tracked countStats = null;
    @tracked mrrStats = null;
    @tracked newsletterStats = null;

    fetch() {
        let daysChanged = this._lastFetchedDays !== this.days;
        let staleData = this._lastFetched && (new Date() - this._lastFetched) > ONE_MINUTE;

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

    fetchCounts() {
        let staleData = this._lastFetchedCounts && (new Date() - this._lastFetchedCounts) > ONE_MINUTE;

        // return an already in-progress promise unless params have changed
        if (this._fetchCountsTask.isRunning) {
            return this._fetchCountsTask.last;
        }

        // return existing stats unless data is > 1 min old
        if (this.countStats && !this._forceRefresh && !staleData) {
            return Promise.resolve(this.countStats);
        }

        return this._fetchCountsTask.perform();
    }

    fetchNewsletterStats() {
        let staleData = this._lastFetchedNewsletterStats && (new Date() - this._lastFetchedNewsletterStats) > ONE_MINUTE;

        // return an already in-progress promise unless params have changed
        if (this._fetchNewsletterStatsTask.isRunning) {
            return this._fetchNewsletterStatsTask.last;
        }

        // return existing stats unless data is > 1 min old
        if (this.newsletterStats && !this._forceRefresh && !staleData) {
            return Promise.resolve(this.newsletterStats);
        }

        return this._fetchNewsletterStatsTask.perform();
    }

    fillDates(data = []) {
        let currentRangeDate = moment().subtract(30, 'days');

        let endDate = moment().add(1, 'hour');
        const output = {};

        const firstDateInRangeIndex = data.findIndex((val) => {
            return moment(val.date).isAfter(currentRangeDate);
        });
        let initialDateInRangeVal = firstDateInRangeIndex > 0 ? data[firstDateInRangeIndex - 1] : null;
        if (firstDateInRangeIndex === 0 && !initialDateInRangeVal) {
            initialDateInRangeVal = data[firstDateInRangeIndex];
        }
        if (data.length > 0 && !initialDateInRangeVal && firstDateInRangeIndex !== 0) {
            initialDateInRangeVal = data[data.length - 1];
        }
        let lastVal = initialDateInRangeVal ? initialDateInRangeVal.value : 0;

        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            output[dateStr] = dataOnDate ? dataOnDate.value : lastVal;
            lastVal = output[dateStr];
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }

    fillCountDates(data = {}) {
        let currentRangeDate = moment().subtract(30, 'days');

        let endDate = moment().add(1, 'hour');
        const output = {};
        const firstDateInRangeIndex = data.findIndex((val) => {
            return moment(val.date).isAfter(currentRangeDate);
        });
        let initialDateInRangeVal = firstDateInRangeIndex > 0 ? data[firstDateInRangeIndex - 1] : null;
        if (firstDateInRangeIndex === 0 && !initialDateInRangeVal) {
            initialDateInRangeVal = data[firstDateInRangeIndex];
        }
        if (data.length > 0 && !initialDateInRangeVal && firstDateInRangeIndex !== 0) {
            initialDateInRangeVal = data[data.length - 1];
        }
        let lastVal = {
            paid: initialDateInRangeVal ? initialDateInRangeVal.paid : 0,
            free: initialDateInRangeVal ? initialDateInRangeVal.free : 0,
            comped: initialDateInRangeVal ? initialDateInRangeVal.comped : 0,
            total: initialDateInRangeVal ? (initialDateInRangeVal.paid + initialDateInRangeVal.free + initialDateInRangeVal.comped) : 0
        };
        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            output[dateStr] = dataOnDate ? {
                paid: dataOnDate.paid,
                free: dataOnDate.free,
                comped: dataOnDate.comped,
                total: dataOnDate.paid + dataOnDate.free + dataOnDate.comped
            } : lastVal;
            lastVal = output[dateStr];
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }

    fetchMRR() {
        let staleData = this._lastFetchedMRR && (new Date() - this._lastFetchedMRR) > ONE_MINUTE;

        // return an already in-progress promise unless params have changed
        if (this._fetchMRRTask.isRunning) {
            return this._fetchMRRTask.last;
        }

        // return existing stats unless data is > 1 min old
        if (this.mrrStats && !this._forceRefresh && !staleData) {
            return Promise.resolve(this.mrrStats);
        }

        return this._fetchMRRTask.perform();
    }

    invalidate() {
        this._forceRefresh = true;
    }

    @task
    *_fetchNewsletterStatsTask() {
        const limit = 5;
        let query = {
            filter: 'email_count:-0',
            order: 'submitted_at desc',
            limit: limit
        };
        const results = yield this.store.query('email', query);
        const data = results.toArray();
        let stats = data.map((d) => {
            return {
                subject: d.subject,
                submittedAt: moment(d.submittedAtUTC).format('YYYY-MM-DD'),
                openRate: d.openRate
            };
        });

        const paddedResults = [];
        if (data.length < limit) {
            const pad = limit - data.length;
            const lastSubmittedAt = data.length > 0 ? data[results.length - 1].submittedAtUTC : moment();
            for (let i = 0; i < pad; i++) {
                paddedResults.push({
                    subject: '',
                    submittedAt: moment(lastSubmittedAt).subtract(i + 1, 'days').format('YYYY-MM-DD'),
                    openRate: 0
                });
            }
        }
        stats = stats .concat(paddedResults);
        stats.reverse();
        this.newsletterStats = stats;
        return stats;
    }

    @task
    *_fetchCountsTask() {
        this._lastFetchedCounts = new Date();

        let statsUrl = this.ghostPaths.url.api('members/stats/count');
        let stats = yield this.ajax.request(statsUrl);
        this.countStats = stats;
        return stats;
    }

    @task
    *_fetchMRRTask() {
        this._lastFetchedMRR = new Date();

        let statsUrl = this.ghostPaths.url.api('members/stats/mrr');
        let stats = yield this.ajax.request(statsUrl);
        this.mrrStats = stats;
        return stats;
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
}
