import Controller from '@ember/controller';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class DashboardController extends Controller {
    @service feature;
    @service session;
    @service membersStats;
    @service store;
    @service settings;
    @service whatsNew;

    @tracked eventsData = null;
    @tracked eventsError = null;
    @tracked eventsLoading = false;

    @tracked mrrStatsData = null;
    @tracked mrrStatsError = null;
    @tracked mrrStatsLoading = false;

    @tracked memberCountStatsData = null;
    @tracked memberCountStatsError = null;
    @tracked memberCountStatsLoading = false;

    @tracked topMembersData = null;
    @tracked topMembersError = null;
    @tracked topMembersLoading = false;

    @tracked newsletterOpenRatesData = null;
    @tracked newsletterOpenRatesError = null;
    @tracked newsletterOpenRatesLoading = false;

    @tracked latestNewsletters = null;

    @tracked whatsNewEntries = null;
    @tracked whatsNewEntriesLoading = null;
    @tracked whatsNewEntriesError = null;

    get topMembersDataHasOpenRates() {
        return this.topMembersData && this.topMembersData.find((member) => {
            return member.emailOpenRate !== null;
        });
    }

    get showMembersData() {
        return this.settings.get('membersSignupAccess') !== 'none';
    }

    initialise() {
        this.loadEvents();
        this.loadTopMembers();
        this.loadCharts();
        this.loadLatestNewsletters.perform();
        this.loadWhatsNew();
    }

    async loadMRRStats() {
        const products = await this.store.query('product', {include: 'monthly_price,yearly_price', limit: 'all'});
        const defaultProduct = products?.firstObject;

        this.mrrStatsLoading = true;
        this.membersStats.fetchMRR().then((stats) => {
            this.mrrStatsLoading = false;
            const statsData = stats.data || [];
            const defaultCurrency = defaultProduct?.monthlyPrice?.currency || 'usd';
            let currencyStats = statsData.find((stat) => {
                return stat.currency === defaultCurrency;
            });
            currencyStats = currencyStats || {
                data: [],
                currency: defaultCurrency
            };
            if (currencyStats) {
                const currencyStatsData = this.membersStats.fillDates(currencyStats.data) || {};
                const dateValues = Object.values(currencyStatsData).map(val => Math.round((val / 100)));
                const currentMRR = dateValues.length ? dateValues[dateValues.length - 1] : 0;
                const rangeStartMRR = dateValues.length ? dateValues[0] : 0;
                const percentGrowth = rangeStartMRR !== 0 ? ((currentMRR - rangeStartMRR) / rangeStartMRR) * 100 : 0;
                this.mrrStatsData = {
                    currentAmount: currentMRR,
                    currency: getSymbol(currencyStats.currency),
                    percentGrowth: percentGrowth.toFixed(1),
                    percentClass: (percentGrowth > 0 ? 'positive' : (percentGrowth < 0 ? 'negative' : '')),
                    options: {
                        rangeInDays: 30
                    },
                    data: {
                        label: 'MRR',
                        dateLabels: Object.keys(currencyStatsData),
                        dateValues
                    },
                    title: 'MRR',
                    stats: currencyStats
                };
            }
        }, (error) => {
            this.mrrStatsError = error;
            this.mrrStatsLoading = false;
        });
    }

    loadMemberCountStats() {
        this.memberCountStatsLoading = true;
        this.membersStats.fetchCounts().then((stats) => {
            this.memberCountStatsLoading = false;

            if (stats) {
                const statsDateObj = this.membersStats.fillCountDates(stats.data) || {};
                const dateValues = Object.values(statsDateObj);
                const currentAllCount = dateValues.length ? dateValues[dateValues.length - 1].total : 0;
                const currentPaidCount = dateValues.length ? dateValues[dateValues.length - 1].paid : 0;
                const currentFreeCount = dateValues.length ? dateValues[dateValues.length - 1].free : 0;
                const rangeStartAllCount = dateValues.length ? dateValues[0].total : 0;
                const rangeStartPaidCount = dateValues.length ? dateValues[0].paid : 0;
                const rangeStartFreeCount = dateValues.length ? dateValues[0].free : 0;
                const allCountPercentGrowth = rangeStartAllCount !== 0 ? ((currentAllCount - rangeStartAllCount) / rangeStartAllCount) * 100 : 0;
                const paidCountPercentGrowth = rangeStartPaidCount !== 0 ? ((currentPaidCount - rangeStartPaidCount) / rangeStartPaidCount) * 100 : 0;
                const freeCountPercentGrowth = rangeStartFreeCount !== 0 ? ((currentFreeCount - rangeStartFreeCount) / rangeStartFreeCount) * 100 : 0;

                this.memberCountStatsData = {
                    all: {
                        percentGrowth: allCountPercentGrowth.toFixed(1),
                        percentClass: (allCountPercentGrowth > 0 ? 'positive' : (allCountPercentGrowth < 0 ? 'negative' : '')),
                        total: dateValues.length ? dateValues[dateValues.length - 1].total : 0,
                        options: {
                            rangeInDays: 30
                        },
                        data: {
                            label: 'Members',
                            dateLabels: Object.keys(statsDateObj),
                            dateValues: dateValues.map(d => d.total)
                        },
                        title: 'Total Members',
                        stats: stats
                    },
                    paid: {
                        percentGrowth: paidCountPercentGrowth.toFixed(1),
                        percentClass: (paidCountPercentGrowth > 0 ? 'positive' : (paidCountPercentGrowth < 0 ? 'negative' : '')),
                        total: dateValues.length ? dateValues[dateValues.length - 1].paid : 0,
                        options: {
                            rangeInDays: 30
                        },
                        data: {
                            label: 'Members',
                            dateLabels: Object.keys(statsDateObj),
                            dateValues: dateValues.map(d => d.paid)
                        },
                        title: 'Paid Members',
                        stats: stats
                    },
                    free: {
                        percentGrowth: freeCountPercentGrowth.toFixed(1),
                        percentClass: (freeCountPercentGrowth > 0 ? 'positive' : (freeCountPercentGrowth < 0 ? 'negative' : '')),
                        total: dateValues.length ? dateValues[dateValues.length - 1].free : 0,
                        options: {
                            rangeInDays: 30
                        },
                        data: {
                            label: 'Members',
                            dateLabels: Object.keys(statsDateObj),
                            dateValues: dateValues.map(d => d.paid)
                        },
                        title: 'Free Members',
                        stats: stats
                    }
                };
            }
        }, (error) => {
            this.memberCountStatsError = error;
            this.memberCountStatsLoading = false;
        });
    }

    loadCharts() {
        this.loadMRRStats();
        this.loadMemberCountStats();
        this.loadNewsletterOpenRates();
    }

    loadEvents() {
        this.eventsLoading = true;
        this.membersStats.fetchTimeline({limit: 5}).then(({events}) => {
            this.eventsData = events;
            this.eventsLoading = false;
        }, (error) => {
            this.eventsError = error;
            this.eventsLoading = false;
        });
    }

    @task
    *loadLatestNewsletters() {
        this.latestNewsletters = yield this.store.query('email', {
            limit: 5,
            order: 'created_at desc'
        });
    }

    loadNewsletterOpenRates() {
        this.newsletterOpenRatesLoading = true;
        this.membersStats.fetchNewsletterStats().then((results) => {
            const rangeStartOpenRate = results.length > 1 ? results[results.length - 2].openRate : 0;
            const rangeEndOpenRate = results.length > 0 ? results[results.length - 1].openRate : 0;
            const percentGrowth = rangeStartOpenRate !== 0 ? ((rangeEndOpenRate - rangeStartOpenRate) / rangeStartOpenRate) * 100 : 0;
            this.newsletterOpenRatesData = {
                percentGrowth: percentGrowth.toFixed(1),
                percentClass: (percentGrowth > 0 ? 'positive' : (percentGrowth < 0 ? 'negative' : '')),
                current: rangeEndOpenRate,
                options: {
                    rangeInDays: 30
                },
                data: {
                    label: 'Open rate',
                    dateLabels: results.map(d => d.subject),
                    dateValues: results.map(d => d.openRate)
                },
                title: 'Open rate',
                stats: results
            };
            this.newsletterOpenRatesLoading = false;
        }, (error) => {
            this.newsletterOpenRatesError = error;
            this.newsletterOpenRatesLoading = false;
        });
    }

    loadTopMembers() {
        this.topMembersLoading = true;
        let query = {
            filter: 'email_open_rate:-null',
            order: 'email_open_rate desc',
            limit: 5
        };
        this.store.query('member', query).then((result) => {
            if (!result.length) {
                return this.store.query('member', {
                    filter: 'status:paid',
                    order: 'created_at asc',
                    limit: 5
                });
            }
            return result;
        }).then((result) => {
            this.topMembersData = result;
            this.topMembersLoading = false;
        }).catch((error) => {
            this.topMembersError = error;
            this.topMembersLoading = false;
        });
    }

    loadWhatsNew() {
        this.whatsNewEntriesLoading = true;
        this.whatsNew.fetchLatest.perform().then(() => {
            this.whatsNewEntriesLoading = false;
            this.whatsNewEntries = this.whatsNew.entries.slice(0, 3);
        }, (error) => {
            this.whatsNewEntriesError = error;
            this.whatsNewEntriesLoading = false;
        });
    }

    @action
    dismissLaunchBanner() {
        this.feature.set('launchComplete', true);
    }
}
