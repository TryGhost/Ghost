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
            hasMultipleTiers: true,
            newslettersEnabled: true,
            membersEnabled: true
        };
    }

    _updateGrow(settings) {
        const change = Math.round(Math.random() * (settings.growRate - settings.shrinkOffset));

        if (settings.growPeriod) {
            settings.growCount += 1;
            if (settings.growCount > settings.growLength) {
                settings.growPeriod = false;
                settings.growCount = 0;
                settings.growLength = Math.floor(Math.random() * settings.maxPeriod) + 20;
            }
        } else {
            settings.growCount += 1;
            if (settings.growCount > settings.growLength) {
                settings.growPeriod = true;
                settings.growCount = 0;
                settings.growLength = Math.floor(Math.random() * settings.maxPeriod) + 20;
            }
        }

        if (settings.growPeriod) {
            if (settings.growRate < settings.maxGrowRate) {
                settings.growRate *= settings.increaseSpeed;
            }
        } else {
            if (settings.growRate > 2) {
                settings.growRate *= settings.decreaseSpeed;
            }
        }
        return change;
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

        let viralCounter = Math.floor(Math.random() * 90);

        let paidSubscribedGrowthTier1 = {
            value: 0,
            growPeriod: true,
            growCount: 0,
            growLength: 3 + Math.floor(Math.random() * 7),
            growRate: 10,
            shrinkOffset: 3,
            maxGrowRate: 200,
            increaseSpeed: 1.04,
            decreaseSpeed: 0.99,
            maxPeriod: 180
        };
        let paidCanceledGrowthTier1 = {
            growPeriod: false,
            growCount: 0,
            growLength: Math.floor(Math.random() * 30),
            growRate: 1,
            shrinkOffset: 4,
            maxGrowRate: 50,
            increaseSpeed: 1.03,
            decreaseSpeed: 0.99,
            maxPeriod: 60
        };

        let paidSubscribedGrowthTier2 = {
            growPeriod: false,
            growCount: 0,
            growLength: Math.floor(Math.random() * 60),
            growRate: 1,
            shrinkOffset: 2,
            maxGrowRate: 50,
            increaseSpeed: 1.04,
            decreaseSpeed: 0.99,
            maxPeriod: 180
        };
        let paidCanceledGrowthTier2 = {
            growPeriod: false,
            growCount: 0,
            growLength: Math.floor(Math.random() * 7),
            growRate: 1,
            shrinkOffset: 4,
            maxGrowRate: 10,
            increaseSpeed: 1.03,
            decreaseSpeed: 0.99,
            maxPeriod: 60
        };

        let freeGrowth = {
            growPeriod: true,
            growCount: 0,
            growLength: Math.floor(Math.random() * 30),
            growRate: 20,
            shrinkOffset: 2,
            maxGrowRate: 200,
            increaseSpeed: 1.02,
            decreaseSpeed: 0.99,
            maxPeriod: 90
        };

        for (let index = 0; index < generateDays; index++) {
            const date = new Date(startDate.getTime());
            date.setDate(date.getDate() + index);

            if (index === 0) {
                stats.push({
                    date: date.toISOString().split('T')[0],
                    free: 0,
                    tier1: 0,
                    tier2: 0,
                    paid: 0,
                    comped: 0,
                    paidSubscribed: 0,
                    paidCanceled: 0
                });
                continue;
            }
            const previous = stats[stats.length - 1];

            let paidSubscribed1 = Math.max(0, this._updateGrow(paidSubscribedGrowthTier1));
            const paidCanceled1 = Math.min(previous.tier1, Math.max(0, this._updateGrow(paidCanceledGrowthTier1)));

            const paidSubscribed2 = Math.max(0, this._updateGrow(paidSubscribedGrowthTier2));
            const paidCanceled2 = Math.min(previous.tier2, Math.max(0, this._updateGrow(paidCanceledGrowthTier2)));

            let freeDelta = Math.max(0, this._updateGrow(freeGrowth));

            viralCounter -= 1;
            
            if (viralCounter <= 0) {
                viralCounter = Math.floor(Math.random() * 900);
                freeDelta += Math.floor(Math.random() * 20 * index);

                paidSubscribed1 += Math.floor(Math.random() * 20 * index);

                // End grow periods
                freeGrowth.growPeriod = true;
                freeGrowth.growLength = Math.floor(Math.random() * 5);
                freeGrowth.growRate = freeDelta;
                paidSubscribedGrowthTier1.growPeriod = true;
                paidSubscribedGrowthTier1.growLength = 0;

                paidCanceledGrowthTier1.growLength = 14;
                paidCanceledGrowthTier1.growPeriod = false;
            }

            const tier1 = Math.max(0, previous.tier1 + paidSubscribed1 - paidCanceled1);
            const tier2 = Math.max(0, previous.tier2 + paidSubscribed2 - paidCanceled2);

            stats.push({
                date: date.toISOString().split('T')[0],
                free: previous.free + freeDelta,
                tier1,
                tier2,
                paid: tier1 + tier2,
                comped: 0,
                paidSubscribed: paidSubscribed1 + paidSubscribed2,
                paidCanceled: paidCanceled1 + paidCanceled2
            });
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
        this.subscriptionCountStats = stats.map((data) => {
            return {
                date: data.date,
                count: data.paid,
                positiveDelta: data.paidSubscribed,
                negativeDelta: data.paidCanceled
            };
        });

        const lastStat = stats[stats.length - 1];
        const currentCounts = {
            total: lastStat.paid + lastStat.free + lastStat.comped,
            paid: lastStat.paid,
            free: lastStat.free + lastStat.comped
        };

        const cadenceRate = Math.random();

        this.paidMembersByCadence = {
            year: Math.floor(currentCounts.paid * cadenceRate),
            month: Math.floor(currentCounts.paid * (1 - cadenceRate))
        };

        this.paidMembersByTier = [
            {
                tier: {
                    name: 'Bronze tier'
                },
                members: Math.floor(currentCounts.paid * 0.6)
            },
            {
                tier: {
                    name: 'Silver tier'
                },
                members: Math.floor(currentCounts.paid * 0.25)
            },
            {
                tier: {
                    name: 'Gold tier'
                },
                members: Math.floor(currentCounts.paid * 0.15)
            }
        ];

        this.newsletterSubscribers = {
            paid: Math.floor(currentCounts.paid * 0.9),
            free: Math.floor(currentCounts.free * 0.5),
            total: Math.floor(currentCounts.paid * 0.9) + Math.floor(currentCounts.free * 0.5)
        };

        this.emailsSent30d = Math.floor(days * 123 / 90);
        
        this.membersLastSeen7d = Math.round(Math.random() * currentCounts.free / 2);
        this.membersLastSeen30d = this.membersLastSeen7d + Math.round(Math.random() * currentCounts.free / 2);

        this.emailOpenRateStats = [];
        if (days >= 7) {
            this.emailOpenRateStats.push(
                {
                    subject: '💸 The best way to get paid to create',
                    openRate: 58,
                    submittedAt: new Date()
                }
            );
        }

        if (days >= 28) {
            this.emailOpenRateStats.push(
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
                }
            );
        }

        if (days >= 40) {
            this.emailOpenRateStats.push(
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
            );
        }

        this.mrrStats = stats.map((s) => {
            return {
                date: s.date,
                mrr: s.tier1 * 501 + s.tier2 * 2500,
                currency: 'usd'
            };
        });
    }
}
