import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ChartAnchor extends Component {
    @service dashboardStats;
    @tracked chartDisplay = 'total';

    @action
    loadCharts() {
        this.dashboardStats.loadMemberCountStats();
        this.dashboardStats.loadMrrStats();
    }

    @action
    changeChartDisplay(type) {
        this.chartDisplay = type;
    }

    get chartShowingTotal() {
        return (this.chartDisplay === 'total');
    }

    get chartShowingPaid() {
        return (this.chartDisplay === 'paid');
    }

    get chartShowingMonthly() {
        return (this.chartDisplay === 'monthly');
    }

    get loading() {
        if (this.chartDisplay === 'total') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'paid') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'monthly') {
            return this.dashboardStats.mrrStats === null;
        }
        return true;
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get paidMembers() {
        return this.dashboardStats.memberCounts?.paid ?? 0;
    }

    get freeMembers() {
        return this.dashboardStats.memberCounts?.free ?? 0;
    }

    get currentMRR() {
        return this.dashboardStats.currentMRR ?? 0;
    }

    get hasTrends() {
        return this.dashboardStats.memberCounts !== null && this.dashboardStats.memberCountsTrend !== null;
    }

    get totalMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.total, this.dashboardStats.memberCounts.total);
    }

    get paidMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.paid, this.dashboardStats.memberCounts.paid);
    }

    get freeMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.free, this.dashboardStats.memberCounts.free);
    }

    get mrrTrend() {
        return this.calculatePercentage(this.dashboardStats.currentMRRTrend, this.dashboardStats.currentMRR);
    }

    get chartType() {
        return 'line';
    }

    get chartData() {
        let stats = [];
        let labels = [];
        let data = [];

        if (this.chartDisplay === 'total') {
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.paid + stat.free + stat.comped);
        }

        if (this.chartDisplay === 'paid') {
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.paid);
        }

        if (this.chartDisplay === 'monthly') {
            stats = this.dashboardStats.filledMrrStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.mrr);
        }

        return {
            labels: labels,
            datasets: [{
                data: data,
                tension: 0.1,
                cubicInterpolationMode: 'monotone',
                fill: true,
                fillColor: '#F5FBFF',
                backgroundColor: '#F5FBFF',
                pointRadius: 0,
                pointHitRadius: 10,
                borderColor: '#14b8ff',
                borderJoinStyle: 'miter',
                maxBarThickness: 20,
                minBarLength: 2
            }]
        };
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: false
            },
            legend: {
                display: false
            },
            layout: {
                padding: {
                    top: 20
                }
            },
            scales: {
                yAxes: [{
                    gridLines: {
                        drawTicks: false,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        fontColor: '#7C8B9A',
                        padding: 8,
                        precision: 0
                    }
                }],
                xAxes: [{
                    gridLines: {
                        drawTicks: false,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        autoSkip: true,
                        maxRotation: 0,
                        minRotation: 0
                    },
                    type: 'time',
                    time: {
                        displayFormats: {
                            millisecond: 'MMM DD',
                            second: 'MMM DD',
                            minute: 'MMM DD',
                            hour: 'MMM DD',
                            day: 'MMM DD',
                            week: 'MMM DD',
                            month: 'MMM DD',
                            quarter: 'MMM DD',
                            year: 'MMM DD'
                        }
                    }
                }]
            }
        };
    }

    calculatePercentage(from, to) {
        if (from === 0) {
            if (to > 0) {
                return 100;
            }
            return 0;
        }

        return Math.round((to - from) / from * 100);
    }
}
