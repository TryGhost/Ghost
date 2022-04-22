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

const DISPLAY_OPTIONS = [{
    name: 'Total members',
    value: 'total'
}, {
    name: 'Paid members',
    value: 'paid'
}, {
    name: 'Free members',
    value: 'free'
}];

export default class Anchor extends Component {
    @service dashboardStats;
    @service feature;
    @tracked chartDisplay = 'total';

    daysOptions = DAYS_OPTIONS;
    displayOptions = DISPLAY_OPTIONS;

    get days() {
        return this.dashboardStats.chartDays;
    }

    set days(days) {
        this.dashboardStats.chartDays = days;
    }

    @action
    loadCharts() {
        this.dashboardStats.loadMemberCountStats();

        if (this.hasPaidTiers) {
            this.dashboardStats.loadMrrStats();
        }
    }

    @action 
    onDisplayChange(selected) {
        this.chartDisplay = selected.value;
    }

    @action 
    onDaysChange(selected) {
        this.days = selected.value;
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get selectedDisplayOption() {
        return this.displayOptions.find(d => d.value === this.chartDisplay) ?? this.displayOptions[0];
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
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

    get hasTrends() {
        return this.dashboardStats.memberCounts !== null 
            && this.dashboardStats.memberCountsTrend !== null;
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

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get chartType() {
        return 'line';
    }

    get chartData() {
        let stats;
        let labels;
        let data;

        if (this.chartDisplay === 'paid') {
            // paid
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.paid + stat.comped);
        } else if (this.chartDisplay === 'free') {
            // free
            stats = this.dashboardStats.filledMemberCountStats;
            labels = stats.map(stat => stat.date);
            data = stats.map(stat => stat.free);
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
                fillColor: 'rgba(142, 66, 255, 0.05)',
                backgroundColor: 'rgba(142, 66, 255, 0.05)',
                pointRadius: 0,
                pointHitRadius: 10,
                pointBorderColor: '#8E42FF',
                pointBackgroundColor: '#8E42FF',
                pointHoverBackgroundColor: '#8E42FF',
                pointHoverBorderColor: '#8E42FF',
                pointHoverRadius: 0,
                borderColor: '#8E42FF',
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
                    bottom: 2,
                    left: 16,
                    right: 16
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
        return 200;
    }

    get chartHeightSmall() {
        return 200;
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
