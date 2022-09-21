import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const CHART_COLORS = [
    '#853EED',
    '#CA3FED',
    '#E993CC',
    '#EE9696',
    '#FEC7C0',
    '#E6E9EB'
];
export default class Recents extends Component {
    @service dashboardStats;
    @tracked chartType = 'free';

    @action
    loadData() {
        this.dashboardStats.loadMemberAttributionStats();
    }

    get chartOptions() {
        return {
            cutoutPercentage: 70,
            borderColor: '#fff',
            legend: {
                display: false,
                position: 'bottom',
                align: 'center',
                labels: {
                    color: 'rgb(255, 99, 132)',
                    fontSize: 12,
                    boxWidth: 10,
                    padding: 6,
                    usePointStyle: true,
                    fontFamily: "Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif"
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            }
        };
    }

    get chartData() {
        if (this.chartType === 'free') {
            const sortedByFree = [...this.sources];
            sortedByFree.sort((a, b) => {
                return b.freeSignups - a.freeSignups;
            });
            return {
                labels: sortedByFree.slice(0, 5).map(source => source.source),
                datasets: [{
                    label: 'Free Signups',
                    data: sortedByFree.slice(0, 5).map(source => source.freeSignups),
                    backgroundColor: CHART_COLORS.slice(0, 5),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        } else {
            const sortedByPaid = [...this.sources];
            sortedByPaid.sort((a, b) => {
                return b.paidPercentage - a.paidPercentage;
            });
            return {
                labels: sortedByPaid.slice(0, 5).map(source => source.source),
                datasets: [{
                    label: 'Paid Conversions',
                    data: sortedByPaid.slice(0, 5).map(source => source.paidConversions),
                    backgroundColor: CHART_COLORS.slice(0, 5),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        }
    }

    get chartOptions() {
    return {
        cutoutPercentage: 70,
        borderColor: '#fff',
        legend: {
            display: false,
            position: 'bottom',
            align: 'center',
            labels: {
                color: 'rgb(255, 99, 132)',
                fontSize: 12,
                boxWidth: 10,
                padding: 6,
                usePointStyle: true,
                fontFamily: "Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif"
            }
        },
        hover: {
            onHover: function (e) {
                e.target.style.cursor = 'pointer';
            }
        }
    };
}

    get sources() {
        return this.dashboardStats?.memberSourceAttributionCounts || [];
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
