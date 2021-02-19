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

    get showTopMembers() {
        return this.feature.get('emailAnalytics') && this.settings.get('emailTrackOpens');
    }

    constructor(...args) {
        super(...args);
        this.loadEvents();
        this.loadTopMembers();
        this.loadCharts();
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
                const percentChange = rangeStartMRR !== 0 ? ((currentMRR - rangeStartMRR) / rangeStartMRR) * 100 : 0.0;
                this.mrrStatsData = {
                    current: `${getSymbol(currencyStats.currency)}${currentMRR}`,
                    percentChange,
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

                this.memberCountStatsData = {
                    all: {
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
    }

    loadEvents() {
        this.eventsLoading = true;
        this.membersStats.fetchTimeline().then(({events}) => {
            this.eventsData = events;
            this.eventsLoading = false;
        }, (error) => {
            this.eventsError = error;
            this.eventsLoading = false;
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
}
