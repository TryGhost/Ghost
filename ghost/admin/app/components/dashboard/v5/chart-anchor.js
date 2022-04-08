import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DATE_FORMAT = 'D MMM YYYY';

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
        document.querySelector('#gh-dashboard5-bar').classList.remove('is-show');
        document.querySelector('#gh-dashboard5-anchor-tooltip').classList.remove('is-show');
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

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get chartTitle() {
        if (this.chartDisplay === 'total') {
            return 'Total members';
        } else if (this.chartDisplay === 'paid') {
            return 'Paid members';
        } else if (this.chartDisplay === 'monthly') {
            return 'MRR';
        }
    }

    get chartType() {
        if (this.chartDisplay === 'total') {
            return 'line';
        } else if (this.chartDisplay === 'paid') {
            return 'bar';
        } else if (this.chartDisplay === 'monthly') {
            return 'line';
        }
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
                tension: 0,
                cubicInterpolationMode: 'monotone',
                fill: true,
                fillColor: 'rgba(20, 184, 255, 0.07)',
                backgroundColor: 'rgba(20, 184, 255, 0.07)',
                pointRadius: 0,
                pointHitRadius: 10,
                pointBorderColor: '#14B8FF',
                pointBackgroundColor: '#14B8FF',
                pointHoverBackgroundColor: '#14B8FF',
                pointHoverBorderColor: '#14B8FF',
                pointHoverRadius: 0,
                borderColor: '#14B8FF',
                borderJoinStyle: 'miter'
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
                    top: 0
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                intersect: false,
                mode: 'index',
                displayColors: false,
                backgroundColor: '#15171A',
                xPadding: 7,
                yPadding: 7,
                cornerRadius: 5,
                caretSize: 7,
                caretPadding: 5,
                bodyFontSize: 12.5,
                titleFontSize: 12,
                titleFontStyle: 'normal',
                titleFontColor: 'rgba(255, 255, 255, 0.7)',
                titleMarginBottom: 3,
                callbacks: {
                    label: (tooltipItems, data) => {
                        let valueText = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                        if (this.chartDisplay === 'total') {
                            return `Total members: ${valueText}`;
                        }
                        if (this.chartDisplay === 'paid') {
                            return `Paid members: ${valueText}`;
                        }
                        if (this.chartDisplay === 'monthly') {
                            return `Monthly revenue (MRR): ${valueText}`;
                        }
                    },
                    title: (tooltipItems) => {
                        return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                    }
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
                        precision: 0,
                        beginAtZero: false
                    },
                    display: true
                }],
                xAxes: [{
                    gridLines: {
                        color: '#DDE1E5',
                        borderDash: [4,4],
                        display: true,
                        drawBorder: true,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: '#DDE1E5',
                        zeroLineBorderDash: [4,4]
                    },
                    ticks: {
                        display: false,
                        maxRotation: 0,
                        minRotation: 0,
                        beginAtZero: false
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
                    },
                    display: true
                }]
            }
        };
    }

    get chartHeight() {
        return 275;
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
