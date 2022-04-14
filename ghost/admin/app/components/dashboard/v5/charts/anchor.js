import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {ghPriceAmount} from '../../../../helpers/gh-price-amount';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DATE_FORMAT = 'D MMM';

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
    name: 'MRR Total',
    value: 'mrr'
}, {
    name: 'MRR Deltas',
    value: 'paid-breakdown'
}];

export default class Anchor extends Component {
    @service dashboardStats;
    @service feature;
    @tracked chartDisplay = 'total';

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
    }

    @action 
    onPaidChange(selected) {
        this.changeChartDisplay(selected.value);

        // The graph won't switch correctly from line -> bar
        // So we need to recreate it somehow.
        // Solution: recreate the DOM by using an #if in hbs
    }

    @action 
    onDaysChange(selected) {
        this.days = selected.value;
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get selectedPaidOption() {
        return this.paidOptions.find(d => d.value === this.chartDisplay) ?? this.paidOptions[0];
    }

    get chartShowingTotal() {
        return (this.chartDisplay === 'total');
    }

    get chartShowingPaid() {
        return (this.chartDisplay === 'paid-total');
    }

    get chartShowingMrr() {
        return (this.chartDisplay === 'mrr' || this.chartDisplay === 'paid-breakdown');
    }

    get loading() {
        if (this.chartDisplay === 'total') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'paid-total') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'paid-breakdown') {
            return this.dashboardStats.memberCountStats === null;
        } else if (this.chartDisplay === 'mrr') {
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
        return this.dashboardStats.memberCounts !== null 
            && this.dashboardStats.memberCountsTrend !== null
            && this.dashboardStats.currentMRR !== null
            && this.dashboardStats.currentMRRTrend !== null;
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
        if (this.chartDisplay === 'paid-total') {
            return 'Total paid members';
        } else if (this.chartDisplay === 'paid-breakdown') {
            return 'MRR Deltas';
        } else if (this.chartDisplay === 'mrr') {
            return 'MRR Total';
        }
        return 'Total members';
    }

    get chartType() {
        if (this.chartDisplay === 'paid-breakdown') {
            return 'bar';
        }
        return 'line';
    }

    get chartData() {
        if (this.chartDisplay === 'paid-breakdown') {
            const stats = this.dashboardStats.filledMemberCountStats;
            const labels = stats.map(stat => stat.date);
            const newData = stats.map(stat => stat.paidSubscribed);
            const canceledData = stats.map(stat => -stat.paidCanceled);
            const netData = stats.map(stat => stat.paidSubscribed - stat.paidCanceled);
            const barThickness = (this.selectedDaysOption.value < 90 ? 18 : 7);

            return {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        data: netData,
                        tension: 0,
                        cubicInterpolationMode: 'monotone',
                        fill: false,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        pointBorderColor: '#14B8FF',
                        pointBackgroundColor: '#14B8FF',
                        pointHoverBackgroundColor: '#14B8FF',
                        pointHoverBorderColor: '#14B8FF',
                        pointHoverRadius: 0,
                        borderColor: 'rgba(189, 197, 204, 0.5)',
                        borderJoinStyle: 'miter',
                        borderWidth: 3
                    }, {
                        data: newData,
                        fill: false,
                        backgroundColor: '#BD96F6',
                        cubicInterpolationMode: 'monotone',
                        barThickness: barThickness,
                        minBarLength: 3
                    }, {
                        data: canceledData,
                        fill: false,
                        backgroundColor: '#FB76B4',
                        cubicInterpolationMode: 'monotone',
                        barThickness: barThickness,
                        minBarLength: 3
                    }]
            };
        }

        let stats;
        let labels;
        let data;

        if (this.chartDisplay === 'paid-total') {
            // paid-total
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.paid);
        } else if (this.chartDisplay === 'mrr') {
            // mrr
            stats = this.dashboardStats.filledMrrStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.mrr);
        } else {
            // total
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.paid + stat.free + stat.comped);
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

    get mrrCurrencySymbol() {
        if (this.dashboardStats.mrrStats === null) {
            return '';
        }
        
        const firstCurrency = this.dashboardStats.mrrStats[0] ? this.dashboardStats.mrrStats[0].currency : 'usd';
        return getSymbol(firstCurrency);
    }

    get chartOptions() {
        let barColor = this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.65)';

        if (this.chartDisplay === 'paid-breakdown') {
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
                        label: (tooltipItems, data) => {
                            let valueText = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

                            if (tooltipItems.datasetIndex === 0) {
                                return `Net: ${valueText}`;
                            }

                            if (tooltipItems.datasetIndex === 1) {
                                return `New paid: ${valueText}`;
                            }

                            if (tooltipItems.datasetIndex === 2) {
                                return `Canceled paid: ${Math.abs(valueText)}`;
                            }
                        },
                        title: (tooltipItems) => {
                            return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        }
                    }
                },
                scales: {
                    yAxes: [{
                        offset: false,
                        gridLines: {
                            drawTicks: false,
                            display: true,
                            drawBorder: false,
                            color: 'rgba(255, 255, 255, 0.1)',
                            lineWidth: 0,
                            zeroLineColor: barColor,
                            zeroLineWidth: 1
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
                        offset: true,
                        stacked: true,
                        gridLines: {
                            color: barColor,
                            borderDash: [4,4],
                            display: true,
                            drawBorder: false,
                            drawTicks: false,
                            zeroLineWidth: 1,
                            zeroLineColor: barColor,
                            zeroLineBorderDash: [4,4]
                        },
                        ticks: {
                            display: false,
                            callback: function (value, index, values) {
                                if (index === 0) {
                                    document.getElementById('gh-dashboard5-anchor-date-start').innerHTML = moment(value).format(DATE_FORMAT);
                                }
                                if (index === values.length - 1) {
                                    document.getElementById('gh-dashboard5-anchor-date-end').innerHTML = moment(value).format(DATE_FORMAT);
                                }
                                return value;
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
                    top: 2,
                    bottom: 2
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
                        if (this.chartDisplay === 'mrr') {
                            // Convert integer in cents to value in USD/other currency.
                            const valueText = ghPriceAmount(data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index]);
                            return `MRR: ${this.mrrCurrencySymbol}${valueText}`;
                        }

                        let valueText = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        let returnable = valueText;

                        if (this.chartDisplay === 'total') {
                            if (tooltipItems.datasetIndex === 0) {
                                returnable = `Total members: ${valueText}`;
                            } else {
                                returnable = `Paid members: ${valueText}`;
                            }
                        }

                        return returnable;
                    },
                    title: (tooltipItems) => {
                        return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                    }
                }
            },
            scales: {
                yAxes: [{
                    display: true,
                    gridLines: {
                        drawTicks: false,
                        display: true,
                        drawBorder: false,
                        color: 'transparent',
                        zeroLineColor: barColor,
                        zeroLineWidth: 1
                    },
                    ticks: {
                        display: false
                    }
                }],
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        align: 'start'
                    },
                    gridLines: {
                        color: barColor,
                        borderDash: [4,4],
                        display: true,
                        drawBorder: true,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: barColor,
                        zeroLineBorderDash: [4,4]
                    },
                    ticks: {
                        display: false,
                        beginAtZero: true,
                        callback: function (value, index, values) {
                            if (index === 0) {
                                document.getElementById('gh-dashboard5-anchor-date-start').innerHTML = moment(value).format(DATE_FORMAT);
                            }
                            if (index === values.length - 1) {
                                document.getElementById('gh-dashboard5-anchor-date-end').innerHTML = moment(value).format(DATE_FORMAT);
                            }
                            return value;
                        }
                    }
                }]
            }
        };
    }

    get chartHeight() {
        return 250;
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
