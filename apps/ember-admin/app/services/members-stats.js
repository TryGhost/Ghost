import Service, {inject as service} from '@ember/service';
import moment from 'moment-timezone';
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
    @tracked totalMemberCount = null;

    get memberCount() {
        const stats = this.totalMemberCount;
        if (!stats) {
            return 0;
        }
        const {free, paid, comped, gift} = stats.meta.totals;
        const total = free + paid + comped + gift || 0;
        return total;
    }

    fetch() {
        const daysChanged = this._lastFetchedDays !== this.days;
        const staleData = this._lastFetched && (new Date() - this._lastFetched) > ONE_MINUTE;

        // return existing stats unless data is > 1 min old or days param has changed
        if (this.stats && !this._forceRefresh && !daysChanged && !staleData && this._fetchTask.last) {
            return this._fetchTask.last;
        }

        return this._fetchTask.perform();
    }

    fetchCounts() {
        const staleData = this._lastFetchedCounts && (new Date() - this._lastFetchedCounts) > ONE_MINUTE;

        // return existing stats unless data is > 1 min old
        if (this.countStats && !this._forceRefresh && !staleData && this._fetchCountsTask.last) {
            return this._fetchCountsTask.last;
        }

        return this._fetchCountsTask.perform();
    }

    fetchMemberCount() {
        // if already running, return existing promise
        if (this._fetchMemberCountsTask.isRunning) {
            return this._fetchMemberCountsTask.last;
        }

        // return existing stats unless data is > 1 min old
        const staleData = this._lastFetchedMemberCounts && (new Date() - this._lastFetchedMemberCounts) > ONE_MINUTE;
        if (this.totalMemberCount && !this._forceRefresh && !staleData && this._fetchMemberCountsTask.last) {
            return this._fetchMemberCountsTask.last;
        }

        return this._fetchMemberCountsTask.perform();
    }

    fetchNewsletterStats() {
        const staleData = this._lastFetchedNewsletterStats && (new Date() - this._lastFetchedNewsletterStats) > ONE_MINUTE;

        // return existing stats unless data is > 1 min old
        if (this.newsletterStats && !this._forceRefresh && !staleData && this._fetchNewsletterStatsTask.last) {
            return this._fetchNewsletterStatsTask.last;
        }

        return this._fetchNewsletterStatsTask.perform();
    }

    fillDates(data = []) {
        let currentRangeDate = moment().subtract(30, 'days');

        const endDate = moment().add(1, 'hour');
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
            const dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            output[dateStr] = dataOnDate ? dataOnDate.value : lastVal;
            lastVal = output[dateStr];
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }

    fillCountDates(data = {}) {
        let currentRangeDate = moment().subtract(30, 'days');

        const endDate = moment().add(1, 'hour');
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
            gift: initialDateInRangeVal ? initialDateInRangeVal.gift : 0,
            total: initialDateInRangeVal ? (initialDateInRangeVal.paid + initialDateInRangeVal.free + initialDateInRangeVal.comped + initialDateInRangeVal.gift) : 0
        };
        while (currentRangeDate.isBefore(endDate)) {
            const dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            output[dateStr] = dataOnDate ? {
                paid: dataOnDate.paid,
                free: dataOnDate.free,
                comped: dataOnDate.comped,
                gift: dataOnDate.gift,
                total: dataOnDate.paid + dataOnDate.free + dataOnDate.comped + dataOnDate.gift
            } : lastVal;
            lastVal = output[dateStr];
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }

    fetchMRR() {
        const staleData = this._lastFetchedMRR && (new Date() - this._lastFetchedMRR) > ONE_MINUTE;

        // return existing stats unless data is > 1 min old
        if (this.mrrStats && !this._forceRefresh && !staleData && this._fetchMRRTask) {
            return this._fetchMRRTask.last;
        }

        return this._fetchMRRTask.perform();
    }

    invalidate() {
        this._forceRefresh = true;
    }

    @task
    *_fetchNewsletterStatsTask() {
        const limit = 5;
        const query = {
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

        const statsUrl = this.ghostPaths.url.api('members/stats/count');
        const stats = yield this.ajax.request(statsUrl);
        this.countStats = stats;
        return stats;
    }

    @task
    *_fetchMemberCountsTask() {
        this._lastFetchedMemberCounts = new Date();

        const statsUrl = this.ghostPaths.url.api('stats/member_count/');
        const stats = yield this.ajax.request(statsUrl);
        this.totalMemberCount = stats;
        return stats;
    }

    @task
    *_fetchMRRTask() {
        this._lastFetchedMRR = new Date();

        const statsUrl = this.ghostPaths.url.api('members/stats/mrr');
        const stats = yield this.ajax.request(statsUrl);
        this.mrrStats = stats;
        return stats;
    }

    @task
    *_fetchTask() {
        const {days} = this;

        this._lastFetchedDays = days;
        this._lastFetched = new Date();
        this._forceRefresh = false;

        const statsUrl = this.ghostPaths.url.api('members/stats');
        const stats = yield this.ajax.request(statsUrl, {data: {days}});
        this.stats = stats;
        return stats;
    }
}
