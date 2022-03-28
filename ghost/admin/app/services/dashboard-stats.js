import Service, {inject as service} from '@ember/service';
import moment from 'moment';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

/**
 * @typedef MrrStat
 * @type {Object}
 * @property {string} date The date (YYYY-MM-DD) on which this MRR was recorded
 * @property {number} mrr The MRR on this date
 */

/**
 * @typedef MemberCountStat
 * @type {Object}
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 * @property {number} paid Amount of paid members
 * @property {number} free Amount of free members
 * @property {number} comped Amount of comped members
 * @property {number} newPaid Amount of new paid members
 * @property {number} canceledPaid Amount of canceled paid members
 */

/**
 * @typedef MemberCounts
 * @type {Object}
 * @property {number} total Total amount of members
 * @property {number} paid Amount of paid members
 * @property {number} free Amount of free members
 */

/**
 * @todo: THIS ONE IS TEMPORARY
 * @typedef EmailOpenRateStat (Will be the same as post model probably)
 * @type {Object}
 * @property {string} id Post id
 * @property {string} title Post title
 * @property {?Object} Email model
 */

/**
 * @typedef PaidMembersByCadence
 * @type {Object}
 * @property {number} annual Paid memebrs on annual plan
 * @property {number} monthly Paid memebrs on monthly plan
 */

/**
 * @typedef PaidMembersForTier
 * @type {Object}
 * @property {Object} tier Tier object
 * @property {number} members Paid members on this tier
 */

/**
 * @typedef SiteStatus Contains information on what graphs need to be shown
 * @type {Object}
 * @property {boolean} hasPaidTiers Whether the site has paid tiers
 * @property {boolean} stripeEnabled Whether the site has stripe enabled
 * @property {boolean} newslettersEnabled Whether the site has newsletters
 * @property {boolean} membersEnabled Whether the site has members enabled
 */

export default class DashboardStatsService extends Service {
    @service dashboardMocks;
    @service store;
    @service ajax;
    @service ghostPaths;

    /**
     * @type {?SiteStatus} Contains information on what graphs need to be shown
     */
    @tracked siteStatus = null;

    /**
     * @type {?MemberCounts} memberCounts
     */
    @tracked
        memberCounts = null;

    /**
     * @type {?MemberCountStat[]}
     */
    @tracked
        memberCountStats = null;

    /**
     * @type {?MrrStat[]}
     */
    @tracked
        mrrStats = null;

    /**
     * @type {PaidMembersByCadence} Number of members for annual and monthly plans
     */
    @tracked
        paidMembersByCadence = null;

    /**
     * @type {PaidMembersForTier[]} Number of members for each tier
     */
    @tracked
        paidMembersByTier = null;

    /**
     * @type {?number} Number of members last seen in last 30 days (could differ if filtered by member status)
     */
    @tracked
        membersLastSeen30d = null;

    /**
     * @type {?number} Number of members last seen in last 7 days (could differ if filtered by member status)
     */
    @tracked
        membersLastSeen7d = null;

    /**
     * @type {?MemberCounts} Number of members that are subscribed (grouped by status)
     */
    @tracked
        newsletterSubscribers = null;

    /**
     * @type {?number} Number of emails sent in last 30 days
     */
    @tracked
        emailsSent30d = null;

    /**
     * @type {?EmailOpenRateStat[]}
     */
    @tracked
        emailOpenRateStats = null;

    /**
     * Amount of days to load for member count and MRR related charts
     */
    @tracked chartDays = 7;

    /**
     * Filter last seen by this status
     * @type {'free'|'paid'|'total'}
     */
    @tracked lastSeenFilterStatus = 'total';

    loadSiteStatus() {
        return this._loadSiteStatus.perform();
    }

    @task
    *_loadSiteStatus() {
        this.siteStatus = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.loadSiteStatus();
            this.siteStatus = {...this.dashboardMocks.siteStatus};
            return;
        }
        // Normal implementation
        // @todo
        this.siteStatus = {
            hasPaidTiers: true,
            stripeEnabled: true,
            newslettersEnabled: true,
            membersEnabled: true
        };
    }

    loadMembersCounts() {
        return this._loadMembersCounts.perform();
    }

    @task({restartable: true})
    *_loadMembersCounts() {
        this.memberCounts = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            if (this.dashboardMocks.memberCounts === null) {
                return null;
            }
            this.memberCounts = {...this.dashboardMocks.memberCounts};
            return;
        }

        // @todo We need to have way to reduce the total number of API requests
        const paidResult = yield this.store.query('member', {limit: 1, filter: 'status:paid'});
        const paid = paidResult.meta.pagination.total;

        const freeResult = yield this.store.query('member', {limit: 1, filter: 'status:-paid'});
        const free = freeResult.meta.pagination.total;

        this.memberCounts = {
            total: paid + free,
            paid,
            free
        };
    }

    loadMemberCountStats() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadMemberCountStats.perform();
    }

    /**
     * Loads the members graphs
     * - total paid
     * - total members
     * for each day in the last chartDays days
     */
    @task({restartable: true})
    *_loadMemberCountStats() {
        this.memberCountStats = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();

            if (this.dashboardMocks.memberCountStats === null) {
                // Note: that this shouldn't happen
                return null;
            }
            this.memberCountStats = this.fillMissingDates(this.dashboardMocks.memberCountStats, {paid: 0, free: 0, comped: 0}, this.chartDays);
            return;
        }

        // @todo: we need to reuse the result of the call when we reload, because the endpoint returns all available days
        // at the moment. We can reuse the result to show 7 days, 30 days, ...
        let statsUrl = this.ghostPaths.url.api('members/stats/count');
        let stats = yield this.ajax.request(statsUrl);
        this.memberCountStats = this.fillMissingDates(stats.data, {paid: 0, free: 0, comped: 0}, this.chartDays);
    }

    loadMrrStats() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadMrrStats.perform();
    }

    /**
     * Loads the mrr graphs for the current chartDays days
     */
    @task({restartable: true})
    *_loadMrrStats() {
        this.mrrStats = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            if (this.dashboardMocks.mrrStats === null) {
                return null;
            }
            this.mrrStats = this.fillMissingDates(this.dashboardMocks.mrrStats, {mrr: 0}, this.chartDays);
            return;
        }

        // @todo: we need to reuse the result of the call when we reload, because the endpoint returns all available days
        // at the moment. We can reuse the result to show 7 days, 30 days, ...
        let statsUrl = this.ghostPaths.url.api('members/stats/mrr');
        let stats = yield this.ajax.request(statsUrl);

        // @todo: add proper support for all different currencies that are returned
        this.mrrStats = this.fillMissingDates(
            stats.data[0].data.map((d) => {
                return {date: d.date, mrr: d.value};
            }), 
            {mrr: 0}, 
            this.chartDays
        );
    }

    loadLastSeen() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadLastSeen.perform();
    }

    /**
     * Loads the mrr graphs
     */
    @task({restartable: true})
    *_loadLastSeen() {
        this.membersLastSeen30d = null;
        this.membersLastSeen7d = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            if (this.lastSeenFilterStatus === 'paid') {
                // @todo
            }
            this.membersLastSeen30d = this.dashboardMocks.membersLastSeen30d;
            this.membersLastSeen7d = this.dashboardMocks.membersLastSeen7d;
            return;
        }

        // @todo We need to have way to reduce the total number of API requests

        const start30d = new Date(Date.now() - 30 * 3600 * 1000);
        const start7d = new Date(Date.now() - 7 * 3600 * 1000);

        let extraFilter = '';
        if (this.lastSeenFilterStatus === 'paid') {
            extraFilter = '+status:paid';
        } else if (this.lastSeenFilterStatus === 'free') {
            extraFilter = '+status:-paid';
        }

        // todo: filter by status here
        const result30d = yield this.store.query('member', {limit: 1, filter: 'last_seen_at:>' + start30d.toISOString() + extraFilter});
        this.membersLastSeen30d = result30d.meta.pagination.total;

        const result7d = yield this.store.query('member', {limit: 1, filter: 'last_seen_at:>' + start7d.toISOString() + extraFilter});
        this.membersLastSeen7d = result7d.meta.pagination.total;
    }

    loadPaidMembersByCadence() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadPaidMembersByCadence.perform();
    }

    @task({restartable: true})
    *_loadPaidMembersByCadence() {
        this.paidMembersByCadence = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.paidMembersByCadence = {...this.dashboardMocks.paidMembersByCadence};
            return;
        }
        // Normal implementation
        // @todo
    }

    loadPaidMembersByTier() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadPaidMembersByTier.perform();
    }

    @task({restartable: true})
    *_loadPaidMembersByTier() {
        this.paidMembersByTier = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.paidMembersByTier = this.dashboardMocks.paidMembersByTier.slice();
            return;
        }
        // Normal implementation
        // @todo
    }

    loadNewsletterSubscribers() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadNewsletterSubscribers.perform();
    }

    @task({restartable: true})
    *_loadNewsletterSubscribers() {
        this.newsletterSubscribers = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.newsletterSubscribers = this.dashboardMocks.newsletterSubscribers;
            return;
        }
        // Normal implementation
        // @todo
    }

    loadEmailsSent() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadEmailsSent.perform();
    }

    @task({restartable: true})
    *_loadEmailsSent() {
        this.emailsSent30d = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.emailsSent30d = this.dashboardMocks.emailsSent30d;
            return;
        }
        // Normal implementation
        // @todo
    }

    loadEmailOpenRateStats() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadEmailOpenRateStats.perform();
    }

    @task({restartable: true})
    *_loadEmailOpenRateStats() {
        this.emailOpenRateStats = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.emailOpenRateStats = this.dashboardMocks.emailOpenRateStats;
            return;
        }

        const posts = yield this.store.query('post', {limit: 5, filter: 'status:published', order: 'published_at desc'});
        this.emailOpenRateStats = posts;
    }

    /**
     * For now this is only used when reloading all the graphs after changing the mocked data
     * @todo: reload only data that we loaded earlier
     */
    reloadAll() {
        this.loadMembersCounts();
        this.loadMrrStats();
        this.loadMemberCountStats();
        this.loadLastSeen();
        this.loadPaidMembersByCadence();
        this.loadPaidMembersByTier();

        this.loadNewsletterSubscribers();
        this.loadEmailsSent();
        this.loadEmailOpenRateStats();
    }

    /**
     * Fill data to match a given amount of days
     * @param {MemberCountStat[]|MrrStat[]} data
     * @param {MemberCountStat|MrrStat} defaultData
     * @param {number} days Amount of days to fill the graph with
     */
    fillMissingDates(data, defaultData, days) {
        let currentRangeDate = moment().subtract(days, 'days');

        let endDate = moment().add(1, 'hour');
        const output = [];
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

        let lastVal = initialDateInRangeVal ? initialDateInRangeVal : defaultData;

        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            lastVal = dataOnDate ? dataOnDate : {...lastVal, date: dateStr};
            output.push(lastVal);
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }
}
