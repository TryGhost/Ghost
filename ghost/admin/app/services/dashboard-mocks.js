import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';

/**
 * @typedef {import('./dashboard-stats').MemberCountStat} MemberCountStat
 * @typedef {import('./dashboard-stats').MemberCounts} MemberCounts
 * @typedef {import('./dashboard-stats').MrrStat} MrrStat
 * @typedef {import('./dashboard-stats').EmailOpenRateStat} EmailOpenRateStat
 * @typedef {import('./dashboard-stats').PaidMembersByCadence} PaidMembersByCadence
 * @typedef {import('./dashboard-stats').PaidMembersForTier} PaidMembersForTier
 * @typedef {import('./dashboard-stats').SiteStatus} SiteStatus
 */

/**
 * Service that contains fake data to be used by the DashboardStatsService if useMocks is enabled
 */
export default class DashboardMocksService extends Service {
    @tracked enabled = false;

    /**
     * Just a setting for generating mocked data, for how long this site has been active.
     */
    @tracked generateDays = 30;

    /**
     * @type {?SiteStatus} Contains information on what graphs need to be shown
    */
    @tracked siteStatus = null;

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

    async waitRandom() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 100 + Math.random() * 1000);
        });
    }

    async loadSiteStatus() {
        if (this.siteStatus !== null) {
            return;
        }
        await this.waitRandom();
        this.siteStatus = {
            hasPaidTiers: true,
            stripeEnabled: true,
            newslettersEnabled: true,
            membersEnabled: true
        };
    }

    /**
     * This method generates new data and forces a reload for all the charts
     * Might be better to move this code to a temporary mocking service
     */
    updateMockedData({days}) {    
        const generateDays = days;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - generateDays + 1);
    
        /**
         * @type {MemberCountStat[]}
         */
        const stats = [];
        let growPeriod = true;
        let growCount = 0;
        let growLength = Math.floor(Math.random() * 14);
        let growRate = 10;

        for (let index = 0; index < generateDays; index++) {
            const date = new Date(startDate.getTime());
            date.setDate(date.getDate() + index);

            const previous = stats.length ? stats[stats.length - 1] : {free: 0, paid: 0, comped: 0};

            const paid = index === 0 ? 0 : Math.max(0, previous.paid + Math.round(Math.random() * (growRate - 3)));
            stats.push({
                date: date.toISOString().split('T')[0],
                free: index === 0 ? 0 : Math.max(0, previous.free + Math.round(Math.random() * (growRate))),
                paid,
                comped: 0,
                paidSubscribed: Math.max(paid - previous.paid + 5, 0),
                paidCanceled: Math.max(previous.paid - paid, 0) + 5
            });

            if (growPeriod) {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = false;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 90) + 20;
                }
            } else {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = true;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 90) + 20;
                }
            }

            if (growPeriod) {
                if (growRate < Math.min(100, previous.free / 10)) {
                    growRate *= 1.01;
                }
            } else {
                if (growRate > 2) {
                    growRate *= 0.99;
                }
            }
        }

        if (stats.length === 0) {
            stats.push(
                {
                    date: new Date().toISOString().split('T')[0],
                    free: 0,
                    paid: 0,
                    comped: 0,
                    paidSubscribed: 0,
                    paidCanceled: 0
                }
            );
        }

        this.memberCountStats = stats;
        const currentCounts = {
            total: (stats[stats.length - 1]?.paid ?? 0) + (stats[stats.length - 1]?.free ?? 0) + (stats[stats.length - 1]?.comped ?? 0),
            paid: stats[stats.length - 1]?.paid ?? 0,
            free: (stats[stats.length - 1]?.free ?? 0) + (stats[stats.length - 1]?.comped ?? 0)
        };

        this.paidMembersByCadence = {
            annual: 546,
            monthly: 5162
        };

        this.paidMembersByTier = [
            {
                tier: {
                    name: 'Bronze tier'
                },
                members: 985
            },
            {
                tier: {
                    name: 'Silver tier'
                },
                members: 459
            },
            {
                tier: {
                    name: 'Gold tier'
                },
                members: 124
            }
        ];

        this.newsletterSubscribers = {
            paid: 156,
            free: 8459,
            total: 156 + 8459
        };

        this.emailsSent30d = 123;
        
        this.membersLastSeen7d = Math.round(Math.random() * currentCounts.free / 2);
        this.membersLastSeen30d = this.membersLastSeen7d + Math.round(Math.random() * currentCounts.free / 2);

        this.emailOpenRateStats = [
            {
                subject: '💸 The best way to get paid to create',
                openRate: 58,
                submittedAt: new Date()
            },
            {
                subject: '🎒How to start a blog and make money',
                openRate: 42,
                submittedAt: new Date()
            },
            {
                subject: 'How to turn your amateur blogging into a real business',
                openRate: 89,
                submittedAt: new Date()
            },
            {
                subject: '💸 The best way to get paid to create',
                openRate: 58,
                submittedAt: new Date()
            },
            {
                subject: '🎒How to start a blog and make money',
                openRate: 42,
                submittedAt: new Date()
            },
            {
                subject: 'How to turn your amateur blogging into a real business',
                openRate: 70,
                submittedAt: new Date()
            },
            {
                subject: '🎒How to start a blog and make money',
                openRate: 90,
                submittedAt: new Date()
            },
            {
                subject: 'How to turn your amateur blogging into a real business',
                openRate: 89,
                submittedAt: new Date()
            }
        ];

        this.mrrStats = stats.map((s) => {
            return {
                date: s.date,
                mrr: s.paid * 5
            };
        });
    }
}
