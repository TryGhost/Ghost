import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DATE_FORMAT = 'D MMM YYYY';

const DAYS_OPTIONS = [{
    name: '7 Days',
    value: 7
}, {
    name: '30 Days',
    value: 30
}, {
    name: '90 Days',
    value: 90
}, {
    name: 'All Time',
    value: 'all'
}];

const PAID_OPTIONS = [{
    name: 'Total Paid Members',
    value: 'paid'
}, {
    name: 'Paid Members By Day',
    value: 'breakdown'
}];

export default class Anchor extends Component {
    @service dashboardStats;
    @service feature;
    @tracked chartDisplay = 'total';
    @tracked paidOptionSelected = 'paid';

    daysOptions = DAYS_OPTIONS;
    paidOptions = PAID_OPTIONS;

    get days() {
        return this.dashboardStats.chartDays;
    }

    set days(days) {
        this.dashboardStats.chartDays = days;
    }

    @action
    onInsert() {
        this.dashboardStats.loadSiteStatus();
    }

    @action
    loadCharts() {
        this.dashboardStats.loadMemberCountStats();
        this.dashboardStats.loadMrrStats();
    }

    @action
    changeChartDisplay(type) {
        this.chartDisplay = type;
        this.loadCharts();
    }

    @action 
    onPaidChange(selected) {
        this.paidOptionSelected = selected.value;
        this.changeChartDisplay(selected.value);
    }

    @action 
    onDaysChange(selected) {
        this.days = selected.value;
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get selectedPaidOption() {
        return this.paidOptions.find(d => d.value === this.paidOptionSelected);
    }

    get chartShowingTotal() {
        return (this.chartDisplay === 'total');
    }

    get chartShowingPaid() {
        return (this.chartDisplay === 'paid' || this.chartDisplay === 'breakdown');
    }

    get chartShowingBreakdown() {
        return (this.chartDisplay === 'breakdown');
    }

    get chartShowingMonthly() {
        return (this.chartDisplay === 'monthly');
    }

    get loading() {
        if (this.chartDisplay === 'total') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'paid') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'breakdown') {
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

    get paidBreakdown() {
        return this.dashboardStats.memberCounts?.breakdown ?? 0;
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

    get paidBreakdownTrend() {
        return '40%';
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

    get chartType() {
        if (this.chartDisplay === 'breakdown') {
            return 'bar';
        }
    
        return 'line';
    }

    get chartData() {
        let stats = [];
        let labels = [];
        let data = [];
        let newData;
        let canceledData;

        if (this.chartDisplay === 'breakdown') {
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            newData = stats.map(stat => stat.paidSubscribed);
            canceledData = stats.map(stat => -stat.paidCanceled);
    
            return {
                labels: labels,
                datasets: [
                    {
                        data: newData,
                        fill: false,
                        backgroundColor: '#BD96F6',
                        cubicInterpolationMode: 'monotone',
                        barThickness: 18
                    },{
                        data: canceledData,
                        fill: false,
                        backgroundColor: '#FB76B4',
                        cubicInterpolationMode: 'monotone',
                        barThickness: 18
                    }]
            };
        }

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
        let maxNumberOfTicks = 7;

        if (this.selectedDaysOption.value === 30) {
            maxNumberOfTicks = 15;
        }

        if (this.selectedDaysOption.value === 90 || this.selectedDaysOption.value === 'all') {
            maxNumberOfTicks = 20;
        }

        if (this.chartDisplay === 'breakdown') {
            return {
                responsive: true,
                maintainAspectRatio: false,
                title: {
                    display: false
                },
                legend: {
                    display: false
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
                        title: (tooltipItems) => {
                            return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        }
                    }
                },
                scales: {
                    yAxes: [{
                        offset: true,
                        gridLines: {
                            drawTicks: false,
                            display: true,
                            drawBorder: false,
                            color: 'rgba(255, 255, 255, 0.1)',
                            lineWidth: 0,
                            zeroLineColor: 'rgba(200, 204, 217, 0.75)',
                            zeroLineWidth: 1
                        },
                        ticks: {
                            display: true,
                            maxTicksLimit: 5,
                            fontColor: '#7C8B9A',
                            padding: 8,
                            precision: 0
                        }
                    }],
                    xAxes: [{
                        offset: true,
                        stacked: true,
                        gridLines: {
                            color: 'rgba(200, 204, 217, 0.75)',
                            borderDash: [4,4],
                            display: true,
                            drawBorder: true,
                            drawTicks: false,
                            zeroLineWidth: 1,
                            zeroLineColor: 'rgba(200, 204, 217, 0.75)',
                            zeroLineBorderDash: [4,4]
                        },
                        ticks: {
                            display: true,
                            maxRotation: 0,
                            minRotation: 0,
                            padding: 8,
                            autoSkip: true,
                            maxTicksLimit: maxNumberOfTicks
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
                        display: true,
                        drawBorder: false,
                        color: 'transparent',
                        zeroLineColor: this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.85)',
                        zeroLineWidth: 1
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        fontColor: '#7C8B9A',
                        padding: 8,
                        precision: 0,
                        stepSize: 1
                    },
                    display: true
                }],
                xAxes: [{
                    gridLines: {
                        color: this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.85)',
                        borderDash: [4,4],
                        display: true,
                        drawBorder: true,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.85)',
                        zeroLineBorderDash: [4,4]
                    },
                    ticks: {
                        display: true,
                        maxRotation: 0,
                        minRotation: 0,
                        padding: 14,
                        autoSkip: true,
                        maxTicksLimit: maxNumberOfTicks,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Droid Sans", "Helvetica Neue", sans-serif',
                        fontSize: 11,
                        fontColor: '#ABB4BE'
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

    get chartHeightSmall() {
        return 225;
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
