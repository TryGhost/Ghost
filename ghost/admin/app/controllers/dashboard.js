import Controller from '@ember/controller';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardController extends Controller {
    @service feature;
    @service session;
    @service membersStats;
    @service store;
    @service settings;
    @service whatsNew;

    @tracked
    eventsData = null;
    @tracked
    eventsError = null;
    @tracked
    eventsLoading = false;

    @tracked
    mrrStatsData = null;
    @tracked
    mrrStatsError = null;
    @tracked
    mrrStatsLoading = false;

    @tracked
    memberCountStatsData = null;
    @tracked
    memberCountStatsError = null;
    @tracked
    memberCountStatsLoading = false;

    @tracked
    topMembersData = null;
    @tracked
    topMembersError = null;
    @tracked
    topMembersLoading = false;

    @tracked
    newsletterOpenRatesData = null;
    @tracked
    newsletterOpenRatesError = null;
    @tracked
    newsletterOpenRatesLoading = false;

    @tracked
    whatsNewEntries = null;

    get showTopMembers() {
        return this.feature.get('emailAnalytics') && this.settings.get('emailTrackOpens');
    }

    initialise() {
        this.loadEvents();
        this.loadTopMembers();
        this.loadCharts();
        this.loadWhatsNew();
    }

    loadMRRStats() {
        this.membersStats.fetchMRR().then((stats) => {
            this.mrrStatsLoading = false;

            let currencyStats = stats[0] || {
                data: [],
                currency: 'usd'
            };
            if (currencyStats) {
                currencyStats.data = this.membersStats.fillDates(currencyStats.data) || {};
                const dateValues = Object.values(currencyStats.data).map(val => val / 100);
                const currentMRR = dateValues.length ? dateValues[dateValues.length - 1] : 0;
                const rangeStartMRR = dateValues.length ? dateValues[0] : 0;
                const percentGrowth = rangeStartMRR !== 0 ? ((currentMRR - rangeStartMRR) / rangeStartMRR) * 100 : 0;
                this.mrrStatsData = {
                    current: `${getSymbol(currencyStats.currency)}${currentMRR}`,
                    percentGrowth: percentGrowth.toFixed(1),
                    percentClass: (percentGrowth > 0 ? 'positive' : (percentGrowth < 0 ? 'negative' : '')),
                    options: {
                        rangeInDays: 30
                    },
                    data: {
                        label: 'MRR',
                        dateLabels: Object.keys(currencyStats.data),
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
        this.membersStats.fetchCounts().then((stats) => {
            this.memberCountStatsLoading = false;

            if (stats) {
                stats.data = this.membersStats.fillCountDates(stats.data) || {};
                const dateValues = Object.values(stats.data);
                const currentAllCount = dateValues.length ? dateValues[dateValues.length - 1].total : 0;
                const currentPaidCount = dateValues.length ? dateValues[dateValues.length - 1].paid : 0;
                const rangeStartAllCount = dateValues.length ? dateValues[0].total : 0;
                const rangeStartPaidCount = dateValues.length ? dateValues[0].paid : 0;
                const allCountPercentGrowth = rangeStartAllCount !== 0 ? ((currentAllCount - rangeStartAllCount) / rangeStartAllCount) * 100 : 0;
                const paidCountPercentGrowth = rangeStartPaidCount !== 0 ? ((currentPaidCount - rangeStartPaidCount) / rangeStartPaidCount) * 100 : 0;

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
                            dateLabels: Object.keys(stats.data),
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
                            dateLabels: Object.keys(stats.data),
                            dateValues: dateValues.map(d => d.paid)
                        },
                        title: 'Paid Members',
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

    loadNewsletterOpenRates() {
        this.newsletterOpenRatesLoading = true;
        this.membersStats.fetchNewsletterStats().then((results) => {
            this.newsletterOpenRatesData = {
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
            limit: 10
        };
        this.store.query('member', query).then((result) => {
            this.topMembersData = result;
            this.topMembersLoading = false;
        }, (error) => {
            this.topMembersError = error;
            this.topMembersLoading = false;
        });
    }

    loadWhatsNew() {
        this.whatsNew.fetchLatest.perform().then(() => {
            this.whatsNewEntries = this.whatsNew.entries.slice(0, 3);
        });
    }
}
