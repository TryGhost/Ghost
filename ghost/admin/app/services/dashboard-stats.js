import Service, {inject as service} from '@ember/service';
import moment from 'moment-timezone';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

import mergeStatsByDate from 'ghost-admin/utils/merge-stats-by-date';

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
 * @property {number} paidSubscribed Amount of new paid members
 * @property {number} paidCanceled Amount of canceled paid members
 */

/**
 * @typedef AttributionCountStat
 * @type {Object}
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 * @property {number} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paidConversions Total paid conversions for this source
 */

/**
 * @typedef SourceAttributionCount
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paidConversions Total paid conversions for this source
 */

/**
 * @typedef MemberCounts
 * @type {Object}
 * @property {number} total Total amount of members
 * @property {number} paid Amount of paid members
 * @property {number} free Amount of free members
 */

/**
 * @typedef EmailOpenRateStat
 * @type {Object}
 * @property {string} subject Email title
 * @property {number} openRate Email openRate
 * @property {Date} submittedAt Date
 */

/**
 * @typedef PaidMembersByCadence
 * @type {Object}
 * @property {number} year Paid members on annual plan
 * @property {number} month Paid members on monthly plan
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
 * @property {boolean} hasMultipleTiers Whether the site has multiple paid tiers
 * @property {boolean} newslettersEnabled Whether the site has newsletters
 * @property {boolean} membersEnabled Whether the site has members enabled
 */

export default class DashboardStatsService extends Service {
    @service dashboardMocks;
    @service store;
    @service ajax;
    @service ghostPaths;
    @service membersCountCache;
    @service settings;
    @service membersUtils;
    @service membersStats;

    /**
     * @type {?SiteStatus} Contains information on what graphs need to be shown
     */
    @tracked siteStatus = null;

    /**
     * @type {?MemberCountStat[]}
     */
    @tracked
        memberCountStats = null;

    @tracked
        subscriptionCountStats = null;

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
     * @type {AttributionCountStat[]} Count of all attribution sources by date
     */
     @tracked
         memberAttributionStats = null;

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
     * @type {number|'all'}
     * Amount of days to load for member count and MRR related charts
     */
    @tracked chartDays = 30 + 1;

    /**
     * Filter last seen by this status
     * @type {'free'|'paid'|'total'}
     */
    @tracked lastSeenFilterStatus = 'total';

    paidTiers = null;

    get activePaidTiers() {
        return this.paidTiers ? this.paidTiers.filter(tier => tier.active) : null;
    }

    /**
     * @type {?MemberCounts}
     */
    get memberCounts() {
        if (!this.memberCountStats) {
            return null;
        }

        const stat = this.memberCountStats[this.memberCountStats.length - 1];
        return {
            total: stat.paid + stat.comped + stat.free,
            paid: stat.paid + stat.comped,
            free: stat.free
        };
    }

    get currentMRR() {
        if (!this.mrrStats) {
            return null;
        }

        const stat = this.mrrStats[this.mrrStats.length - 1];
        return stat.mrr;
    }

    /**
     * @type {?MemberCounts}
     */
    get memberCountsTrend() {
        if (!this.memberCountStats) {
            return null;
        }

        if (this.chartDays === 'all') {
            return null;
        }

        // Search for the value at chartDays ago (if any, else the first before it, or the next one if not one before it)
        const searchDate = moment().add(-this.chartDays, 'days').format('YYYY-MM-DD');

        for (let index = this.memberCountStats.length - 1; index >= 0; index -= 1) {
            const stat = this.memberCountStats[index];
            if (stat.date <= searchDate) {
                return {
                    total: stat.paid + stat.comped + stat.free,
                    paid: stat.paid + stat.comped,
                    free: stat.free
                };
            }
        }

        // We don't have any statistic from more than x days ago.
        // Return all zero values
        return {
            total: 0,
            paid: 0,
            free: 0
        };
    }

    /**
     * @type {SourceAttributionCount[]}
     */
    get memberSourceAttributionCounts() {
        if (!this.memberAttributionStats) {
            return [];
        }

        return this.memberAttributionStats.filter((stat) => {
            if (this.chartDays === 'all') {
                return true;
            }
            return stat.date >= moment().add(-this.chartDays, 'days').format('YYYY-MM-DD');
        }).reduce((acc, stat) => {
            const statSource = stat.source ?? '';
            const existingSource = acc.find(s => s.source === statSource);
            if (existingSource) {
                existingSource.signups += stat.signups || 0;
                existingSource.paidConversions += stat.paidConversions || 0;
            } else {
                acc.push({
                    source: statSource,
                    signups: stat.signups || 0,
                    paidConversions: stat.paidConversions || 0
                });
            }
            return acc;
        }, []).sort((a, b) => {
            return b.signups - a.signups;
        });
    }

    get currentMRRTrend() {
        if (!this.mrrStats) {
            return null;
        }

        if (this.chartDays === 'all') {
            return null;
        }

        // Search for the value at chartDays ago (if any, else the first before it, or the next one if not one before it)
        const searchDate = moment().add(-this.chartDays, 'days').format('YYYY-MM-DD');

        for (let index = this.mrrStats.length - 1; index >= 0; index -= 1) {
            const stat = this.mrrStats[index];
            if (stat.date <= searchDate) {
                return stat.mrr;
            }
        }

        // We don't have any statistic from more than x days ago.
        // Return all zero values
        return 0;
    }

    get filledMemberCountStats() {
        if (this.memberCountStats === null) {
            return null;
        }
        function copyData(obj) {
            return {
                paid: obj.paid,
                free: obj.free,
                comped: obj.comped,
                paidCanceled: 0,
                paidSubscribed: 0,
                signups: 0,
                cancellations: 0
            };
        }
        return this.fillMissingDates(this.memberCountStats, {paid: 0, free: 0, comped: 0, paidCanceled: 0, paidSubscribed: 0, signups: 0, cancellations: 0}, copyData, this.chartDays);
    }

    get filledMrrStats() {
        if (this.mrrStats === null) {
            return null;
        }
        function copyData(obj) {
            return {
                mrr: obj.mrr
            };
        }
        return this.fillMissingDates(this.mrrStats, {mrr: 0}, copyData, this.chartDays);
    }

    get filledSubscriptionCountStats() {
        if (!this.subscriptionCountStats) {
            return null;
        }
        function copyData(obj) {
            return {
                count: obj.count,
                positiveDelta: 0,
                negativeDelta: 0,
                signups: 0,
                cancellations: 0
            };
        }
        return this.fillMissingDates(this.subscriptionCountStats, {
            positiveDelta: 0,
            negativeDelta: 0,
            count: 0,
            signups: 0,
            cancellations: 0
        }, copyData, this.chartDays);
    }

    loadSiteStatus() {
        if (this._loadSiteStatus.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadSiteStatus.last;
        }
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

        if (this.membersUtils.paidMembersEnabled) {
            yield this.loadPaidTiers();
        }

        const hasPaidTiers = this.membersUtils.paidMembersEnabled && this.activePaidTiers && this.activePaidTiers.length > 0;

        this.siteStatus = {
            hasPaidTiers,
            hasMultipleTiers: hasPaidTiers && this.activePaidTiers.length > 1,
            newslettersEnabled: this.settings.editorDefaultEmailRecipients !== 'disabled',
            membersEnabled: this.membersUtils.isMembersEnabled
        };
    }

    loadPaidMembersByCadence() {
        this.loadSubscriptionCountStats();
    }

    loadPaidMembersByTier() {
        this.loadSubscriptionCountStats();
    }

    loadSubscriptionCountStats() {
        if (this._loadSubscriptionCountStats.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadSubscriptionCountStats.last;
        }
        return this._loadSubscriptionCountStats.perform();
    }

    /**
     * Loads the subscriptions count history
     */
    @task
    *_loadSubscriptionCountStats() {
        this.subscriptionCountStats = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();

            if (this.dashboardMocks.subscriptionCountStats === null) {
                // Note: that this shouldn't happen
                return null;
            }
            this.subscriptionCountStats = this.dashboardMocks.subscriptionCountStats;
            this.paidMembersByCadence = {...this.dashboardMocks.paidMembersByCadence};
            this.paidMembersByTier = [...this.dashboardMocks.paidMembersByTier];
            return;
        }

        let statsUrl = this.ghostPaths.url.api('stats/subscriptions');
        let result = yield this.ajax.request(statsUrl);

        const paidMembersByCadence = {
            month: 0,
            year: 0
        };

        for (const cadence of result.meta.cadences) {
            paidMembersByCadence[cadence] = result.meta.totals.reduce((sum, total) => {
                if (total.cadence !== cadence) {
                    return sum;
                }
                return sum + total.count;
            }, 0);
        }

        yield this.loadPaidTiers();

        const paidMembersByTier = [];

        for (const tier of result.meta.tiers) {
            const _tier = this.paidTiers.find(x => x.id === tier);

            if (!_tier) {
                continue;
            }
            paidMembersByTier.push({
                tier: {
                    id: _tier.id,
                    name: _tier.name
                },
                members: result.meta.totals.reduce((sum, total) => {
                    if (total.tier !== tier) {
                        return sum;
                    }
                    return sum + total.count;
                }, 0)
            });
        }

        // Add all missing tiers without members
        for (const tier of this.activePaidTiers) {
            if (!paidMembersByTier.find(t => t.tier.id === tier.id)) {
                paidMembersByTier.push({
                    tier: {
                        id: tier.id,
                        name: tier.name
                    },
                    members: 0
                });
            }
        }

        const subscriptionCountStats = mergeStatsByDate(result.stats);

        this.paidMembersByCadence = paidMembersByCadence;
        this.paidMembersByTier = paidMembersByTier;
        this.subscriptionCountStats = subscriptionCountStats;
    }

    loadMemberCountStats() {
        if (this._loadMemberCountStats.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadMemberCountStats.last;
        }
        return this._loadMemberCountStats.perform();
    }

    /**
     * Loads the members count history
     */
    @task
    *_loadMemberCountStats() {
        this.memberCountStats = null;
        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();

            if (this.dashboardMocks.memberCountStats === null) {
                // Note: that this shouldn't happen
                return null;
            }
            this.memberCountStats = this.dashboardMocks.memberCountStats;
            return;
        }

        const stats = yield this.membersStats.fetchMemberCount();
        this.memberCountStats = stats.stats.map((d) => {
            return {
                ...d,
                paidCanceled: d.paid_canceled,
                paidSubscribed: d.paid_subscribed
            };
        });
    }

    loadMemberAttributionStats() {
        if (this._loadMemberAttributionStats.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadMemberAttributionStats.last;
        }
        return this._loadMemberAttributionStats.perform();
    }

    /**
     * Loads the members attribution stats
     */
     @task
    *_loadMemberAttributionStats() {
        this.memberAttributionStats = [];

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.memberAttributionStats = this.dashboardMocks.memberAttributionStats;
            return;
        }
        let statsUrl = this.ghostPaths.url.api('stats/referrers');
        let stats = yield this.ajax.request(statsUrl);

        this.memberAttributionStats = stats.stats.map((stat) => {
            return {
                ...stat,
                paidConversions: stat.paid_conversions
            };
        });
    }

     loadMrrStats() {
         if (this._loadMrrStats.isRunning) {
             // We need to explicitly wait for the already running task instead of dropping it and returning immediately
             return this._loadMrrStats.last;
         }
         return this._loadMrrStats.perform();
     }

    /**
     * Loads the mrr graphs for the current chartDays days
     */
    @task
     *_loadMrrStats() {
         this.mrrStats = null;
         if (this.dashboardMocks.enabled) {
             yield this.dashboardMocks.waitRandom();
             if (this.dashboardMocks.mrrStats === null) {
                 return null;
             }
             this.mrrStats = this.dashboardMocks.mrrStats;
             return;
         }

         let statsUrl = this.ghostPaths.url.api('stats/mrr');
         let stats = yield this.ajax.request(statsUrl);

         // Only show the highest value currency and filter the other ones out
         const totals = stats.meta.totals;
         let currentMax = totals[0];
         if (!currentMax) {
             // No valid data
             this.mrrStats = [];
             return;
         }

         for (const total of totals) {
             if (total.mrr > currentMax.mrr) {
                 currentMax = total;
             }
         }

         const useCurrency = currentMax.currency;
         this.mrrStats = stats.stats.filter(d => d.currency === useCurrency);
     }

    loadLastSeen() {
        // todo: add proper logic to prevent duplicate calls + reuse results if nothing has changed
        return this._loadLastSeen.perform();
    }

    /**
     * Loads the last seen counts
     */
    @task
    *_loadLastSeen() {
        this.membersLastSeen30d = null;
        this.membersLastSeen7d = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.membersLastSeen30d = this.dashboardMocks.membersLastSeen30d;
            this.membersLastSeen7d = this.dashboardMocks.membersLastSeen7d;
            return;
        }

        const start30d = new Date(Date.now() - 30 * 86400 * 1000);
        const start7d = new Date(Date.now() - 7 * 86400 * 1000);

        // The cache is useless if we don't round on a fixed date.
        start30d.setHours(0, 0, 0, 0);
        start7d.setHours(0, 0, 0, 0);

        let extraFilter = '';
        if (this.lastSeenFilterStatus === 'paid') {
            extraFilter = '+status:paid';
        } else if (this.lastSeenFilterStatus === 'free') {
            extraFilter = '+status:-paid';
        }

        const [result30d, result7d] = yield Promise.all([
            this.membersCountCache.count('last_seen_at:>' + start30d.toISOString() + extraFilter),
            this.membersCountCache.count('last_seen_at:>' + start7d.toISOString() + extraFilter)
        ]);

        this.membersLastSeen30d = result30d;
        this.membersLastSeen7d = result7d;
    }

    loadPaidTiers() {
        if (this.paidTiers !== null) {
            return;
        }
        if (this._loadPaidTiers.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadPaidTiers.last;
        }
        return this._loadPaidTiers.perform();
    }

    @task
    *_loadPaidTiers() {
        const data = yield this.store.query('tier', {
            filter: 'type:paid',
            limit: 'all'
        });
        this.paidTiers = data.toArray();
    }

    loadNewsletterSubscribers() {
        if (this._loadNewsletterSubscribers.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadNewsletterSubscribers.last;
        }
        return this._loadNewsletterSubscribers.perform();
    }

    @task
    *_loadNewsletterSubscribers() {
        this.newsletterSubscribers = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.newsletterSubscribers = this.dashboardMocks.newsletterSubscribers;
            return;
        }

        const [paid, free] = yield Promise.all([
            this.membersCountCache.count('newsletters.status:active+status:-free+email_disabled:0'),
            this.membersCountCache.count('newsletters.status:active+status:free+email_disabled:0')
        ]);

        this.newsletterSubscribers = {
            total: paid + free,
            free,
            paid
        };
    }

    loadEmailsSent() {
        if (this._loadEmailsSent.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadEmailsSent.last;
        }
        return this._loadEmailsSent.perform();
    }

    @task
    *_loadEmailsSent() {
        this.emailsSent30d = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.emailsSent30d = this.dashboardMocks.emailsSent30d;
            return;
        }

        const start30d = new Date(Date.now() - 30 * 86400 * 1000);
        const result = yield this.store.query('email', {limit: 100, filter: `submitted_at:>'${start30d.toISOString()}'`});
        this.emailsSent30d = result.reduce((c, email) => c + email.emailCount, 0);
    }

    loadEmailOpenRateStats() {
        if (this._loadEmailOpenRateStats.isRunning) {
            // We need to explicitly wait for the already running task instead of dropping it and returning immediately
            return this._loadEmailOpenRateStats.last;
        }
        return this._loadEmailOpenRateStats.perform();
    }

    @task
    *_loadEmailOpenRateStats() {
        this.emailOpenRateStats = null;

        if (this.dashboardMocks.enabled) {
            yield this.dashboardMocks.waitRandom();
            this.emailOpenRateStats = this.dashboardMocks.emailOpenRateStats;
            return;
        }

        const limit = 8;
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
        stats = stats.concat(paddedResults);
        stats.reverse();
        this.emailOpenRateStats = stats;
    }

    /**
     * For now this is only used when reloading all the graphs after changing the mocked data
     * @todo: reload only data that we loaded earlier
     */
    async reloadAll() {
        // Clear all pending tasks (if any)
        // Promise.all doesn't work here because they sometimes return undefined
        await this._loadSiteStatus.cancelAll();
        await this._loadMrrStats.cancelAll();
        await this._loadMemberCountStats.cancelAll();
        await this._loadSubscriptionCountStats.cancelAll();
        await this._loadLastSeen.cancelAll();
        await this._loadNewsletterSubscribers.cancelAll();
        await this._loadEmailsSent.cancelAll();
        await this._loadEmailOpenRateStats.cancelAll();
        await this._loadMemberAttributionStats.cancelAll();

        // Restart tasks
        this.loadSiteStatus();

        this.loadMrrStats();
        this.loadMemberCountStats();
        this.loadSubscriptionCountStats();
        this.loadLastSeen();
        this.loadPaidMembersByCadence();
        this.loadPaidMembersByTier();

        this.loadNewsletterSubscribers();
        this.loadEmailsSent();
        this.loadEmailOpenRateStats();
        this.loadMemberAttributionStats();
    }

    /**
     * Fill data to match a given amount of days
     * @param {MemberCountStat[]|MrrStat[]} data
     * @param {MemberCountStat|MrrStat} defaultData
     * @param {number|'all'} days Amount of days to fill the graph with
     */
    fillMissingDates(data, defaultData, copyData, days) {
        let currentRangeDate;

        if (days === 'all') {
            const MINIMUM_DAYS = 90;
            currentRangeDate = moment().subtract(MINIMUM_DAYS - 1, 'days');

            // Make sure all charts are synced correctly and have the same start date when choosing 'all time'
            if (this.mrrStats !== null && this.mrrStats.length > 0) {
                const date = moment(this.mrrStats[0].date);
                if (date.toDate() < currentRangeDate.toDate()) {
                    currentRangeDate = date;
                }
            }

            if (this.memberCountStats !== null && this.memberCountStats.length > 0) {
                const date = moment(this.memberCountStats[0].date);
                if (date.toDate() < currentRangeDate.toDate()) {
                    currentRangeDate = date;
                }
            }
        } else {
            currentRangeDate = moment().subtract(days - 1, 'days');
        }

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
            if (dataOnDate) {
                lastVal = dataOnDate;
            } else {
                lastVal = {
                    date: dateStr,
                    ...copyData(lastVal)
                };
            }
            output.push(lastVal);
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }
}
