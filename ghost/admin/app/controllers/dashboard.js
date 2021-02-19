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
    events = {
        data: null,
        error: null,
        loading: false
    };
    @tracked
    mrrStats = {
        data: null,
        error: null,
        loading: false
    };
    @tracked
    memberCountStats = {
        data: null,
        error: null,
        loading: false
    };

    @tracked
    topMembers = {
        data: null,
        error: null,
        loading: false
    };

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
            this.events.loading = false;

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
                this.mrrStats.data = {
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
            this.mrrStats.error = error;
            this.events.loading = false;
        });
    }

    loadMemberCountStats() {
        this.membersStats.fetchCounts().then((stats) => {
            this.events.loading = false;

            if (stats) {
                stats.data = this.membersStats.fillCountDates(stats.data) || {};
                const dateValues = Object.values(stats.data);

                this.memberCountStats.data = {
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
            this.mrrStats.error = error;
            this.events.loading = false;
        });
    }

    loadCharts() {
        this.loadMRRStats();
        this.loadMemberCountStats();
    }

    loadEvents() {
        this.events.loading = true;
        this.membersStats.fetchTimeline().then(({events}) => {
            this.events.data = events;
            this.events.loading = false;
        }, (error) => {
            this.events.error = error;
            this.events.loading = false;
        });
    }

    loadTopMembers() {
        this.topMembers.loading = true;
        let query = {
            filter: 'email_open_rate:-null',
            order: 'email_open_rate desc',
            limit: 10
        };
        this.store.query('member', query).then((result) => {
            this.topMembers.data = result;
            this.topMembers.loading = false;
        }, (error) => {
            this.topMembers.error = error;
            this.topMembers.loading = false;
        });
    }
}
