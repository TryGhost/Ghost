import Component from '@glimmer/component';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardMembersGraphs extends Component {
    @service membersStats;
    @service store;

    @tracked mrrStatsData = null;
    @tracked mrrStatsError = null;
    @tracked mrrStatsLoading = false;

    @tracked memberCountStatsData = null;
    @tracked memberCountStatsError = null;
    @tracked memberCountStatsLoading = false;

    @tracked newsletterOpenRatesData = null;
    @tracked newsletterOpenRatesError = null;
    @tracked newsletterOpenRatesLoading = false;

    constructor() {
        super(...arguments);
        this.loadCharts();
    }

    loadCharts() {
        this.loadMRRStats();
        this.loadMemberCountStats();
        this.loadNewsletterOpenRates();
    }

    async loadMRRStats() {
        const tiers = await this.store.query('tier', {
            filter: 'type:paid', include: 'monthly_price,yearly_price', limit: 'all'
        });
        const defaultTier = tiers?.firstObject;

        this.mrrStatsLoading = true;
        this.membersStats.fetchMRR().then((stats) => {
            this.mrrStatsLoading = false;
            const statsData = stats.data || [];
            const defaultCurrency = defaultTier?.monthlyPrice?.currency || 'usd';
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
                    }
                };
            }
        }, (error) => {
            this.memberCountStatsError = error;
            this.memberCountStatsLoading = false;
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
}
