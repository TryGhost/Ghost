/* global Chart */

import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DATE_FORMAT = 'D MMM, YYYY';

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

// custom ChartJS draw function
Chart.defaults.hoverLine = Chart.defaults.line;
Chart.controllers.hoverLine = Chart.controllers.line.extend({
    draw: function (ease) {
        Chart.controllers.line.prototype.draw.call(this, ease);

        if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
            let activePoint = this.chart.tooltip._active[0],
                ctx = this.chart.ctx,
                x = activePoint.tooltipPosition().x,
                topY = this.chart.legend.bottom,
                bottomY = this.chart.chartArea.bottom;

            // draw line
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.setLineDash([3, 4]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#7C8B9A';
            ctx.stroke();
            ctx.restore();
        }
    }
});

export default class Anchor extends Component {
    @service dashboardStats;
    @service feature;
    @tracked chartDisplay = 'total';

    displayOptions = DISPLAY_OPTIONS;

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

    get selectedDisplayOption() {
        return this.displayOptions.find(d => d.value === this.chartDisplay) ?? this.displayOptions[0];
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts && this.totalMembers === 0;
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
        return 'hoverLine'; // uses custom ChartJS draw function
    }

    get chartTitle() {
        // paid
        if (this.chartDisplay === 'paid') {
            return 'Paid members';
        // free
        } else if (this.chartDisplay === 'free') {
            return 'Free members';
        }
        // total
        return 'Total members';
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

        // with no members yet, let's show empty state with dummy data
        if (this.isTotalMembersZero) {
            stats = this.emptyData.stats;
            labels = this.emptyData.labels;
            data = this.emptyData.data;
        }

        // gradient for line
        const canvasLine = document.createElement('canvas');
        const ctxLine = canvasLine.getContext('2d');
        const gradientLine = ctxLine.createLinearGradient(0, 0, 1000, 0);
        gradientLine.addColorStop(0, 'rgba(250, 45, 142, 1');   
        gradientLine.addColorStop(1, 'rgba(143, 66, 255, 1');
  
        // gradient for fill
        const canvasFill = document.createElement('canvas');
        const ctxFill = canvasFill.getContext('2d');
        const gradientFill = ctxFill.createLinearGradient(0, 0, 1000, 0);
        gradientFill.addColorStop(0, 'rgba(250, 45, 142, 0.2');   
        gradientFill.addColorStop(1, 'rgba(143, 66, 255, 0.1');
        
        return {
            labels: labels,
            datasets: [{
                data: data,
                tension: 1,
                cubicInterpolationMode: 'monotone',
                fill: true,
                fillColor: gradientFill,
                backgroundColor: gradientFill,
                pointRadius: 0,
                pointHitRadius: 10,
                pointBorderColor: '#8E42FF',
                pointBackgroundColor: '#8E42FF',
                pointHoverBackgroundColor: '#8E42FF',
                pointHoverBorderColor: '#8E42FF',
                pointHoverRadius: 0,
                borderColor: gradientLine,
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
        let activeDays = this.dashboardStats.chartDays;
        let barColor = this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.65)';

        return {
            maintainAspectRatio: false,
            responsiveAnimationDuration: 1,
            animation: false,
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
                    left: 1,
                    right: 1
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'index',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard-anchor-tooltip');
                    const chartContainerEl = tooltipEl.parentElement;
                    const chartWidth = chartContainerEl.offsetWidth;
                    const tooltipWidth = tooltipEl.offsetWidth;

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return; 
                    }

                    // update tooltip styles
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';

                    let offsetX = 0;
                    if (tooltip.x > chartWidth - tooltipWidth) {
                        offsetX = tooltipWidth - 10;
                    }

                    tooltipEl.style.left = tooltip.x - offsetX + 'px';
                    tooltipEl.style.top = tooltip.y + 'px';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        document.querySelector('#gh-dashboard-anchor-tooltip .gh-dashboard-tooltip-value .value').innerHTML = value;
                    },
                    title: (tooltipItems) => {
                        const value = moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        document.querySelector('#gh-dashboard-anchor-tooltip .gh-dashboard-tooltip-label').innerHTML = value;
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
                        borderDash: [3,4],
                        display: true,
                        drawBorder: true,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: barColor,
                        zeroLineBorderDash: [3,4]
                    },
                    ticks: {
                        display: false,
                        autoSkip: false,
                        callback: function (value, index, values) {
                            if (index === 0) {
                                document.getElementById('gh-dashboard-anchor-date-start').innerHTML = moment(value).format(DATE_FORMAT);
                            }
                            if (index === (values.length - 1)) {
                                document.getElementById('gh-dashboard-anchor-date-end').innerHTML = moment(value).format(DATE_FORMAT);
                            }

                            if (activeDays === (30 + 1)) {
                                if (!(index % 2)) {
                                    return value;
                                }
                            } else if (activeDays === (90 + 1)) {
                                if (!(index % 3)) {
                                    return value;
                                }
                            } else {
                                return value;
                            }
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
        return 180;
    }

    // used for empty state
    get emptyData() {
        return {
            stats: [
                {
                    date: '2022-04-07',
                    free: 2610,
                    tier1: 295,
                    tier2: 20,
                    paid: 315,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-08',
                    free: 2765,
                    tier1: 298,
                    tier2: 24,
                    paid: 322,
                    comped: 0,
                    paidSubscribed: 7,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-09',
                    free: 3160,
                    tier1: 299,
                    tier2: 28,
                    paid: 327,
                    comped: 0,
                    paidSubscribed: 5,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-10',
                    free: 3580,
                    tier1: 300,
                    tier2: 30,
                    paid: 330,
                    comped: 0,
                    paidSubscribed: 4,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-11',
                    free: 3583,
                    tier1: 301,
                    tier2: 31,
                    paid: 332,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-12',
                    free: 3857,
                    tier1: 303,
                    tier2: 36,
                    paid: 339,
                    comped: 0,
                    paidSubscribed: 8,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-13',
                    free: 4223,
                    tier1: 304,
                    tier2: 39,
                    paid: 343,
                    comped: 0,
                    paidSubscribed: 4,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-14',
                    free: 4289,
                    tier1: 306,
                    tier2: 42,
                    paid: 348,
                    comped: 0,
                    paidSubscribed: 6,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-15',
                    free: 4458,
                    tier1: 307,
                    tier2: 49,
                    paid: 356,
                    comped: 0,
                    paidSubscribed: 8,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-16',
                    free: 4752,
                    tier1: 307,
                    tier2: 49,
                    paid: 356,
                    comped: 0,
                    paidSubscribed: 1,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-17',
                    free: 4947,
                    tier1: 310,
                    tier2: 50,
                    paid: 360,
                    comped: 0,
                    paidSubscribed: 5,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-18',
                    free: 5047,
                    tier1: 312,
                    tier2: 49,
                    paid: 361,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-19',
                    free: 5430,
                    tier1: 314,
                    tier2: 55,
                    paid: 369,
                    comped: 0,
                    paidSubscribed: 8,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-20',
                    free: 5760,
                    tier1: 316,
                    tier2: 57,
                    paid: 373,
                    comped: 0,
                    paidSubscribed: 4,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-21',
                    free: 6022,
                    tier1: 318,
                    tier2: 63,
                    paid: 381,
                    comped: 0,
                    paidSubscribed: 9,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-22',
                    free: 6294,
                    tier1: 319,
                    tier2: 64,
                    paid: 383,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-23',
                    free: 6664,
                    tier1: 320,
                    tier2: 69,
                    paid: 389,
                    comped: 0,
                    paidSubscribed: 6,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-24',
                    free: 6721,
                    tier1: 320,
                    tier2: 70,
                    paid: 390,
                    comped: 0,
                    paidSubscribed: 1,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-25',
                    free: 6841,
                    tier1: 321,
                    tier2: 80,
                    paid: 401,
                    comped: 0,
                    paidSubscribed: 11,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-26',
                    free: 6880,
                    tier1: 323,
                    tier2: 89,
                    paid: 412,
                    comped: 0,
                    paidSubscribed: 11,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-27',
                    free: 7179,
                    tier1: 325,
                    tier2: 92,
                    paid: 417,
                    comped: 0,
                    paidSubscribed: 5,
                    paidCanceled: 0
                },
                {
                    date: '2022-04-28',
                    free: 7288,
                    tier1: 325,
                    tier2: 100,
                    paid: 425,
                    comped: 0,
                    paidSubscribed: 9,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-29',
                    free: 7430,
                    tier1: 325,
                    tier2: 101,
                    paid: 426,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 1
                },
                {
                    date: '2022-04-30',
                    free: 7458,
                    tier1: 326,
                    tier2: 102,
                    paid: 428,
                    comped: 0,
                    paidSubscribed: 2,
                    paidCanceled: 0
                },
                {
                    date: '2022-05-01',
                    free: 7621,
                    tier1: 327,
                    tier2: 117,
                    paid: 444,
                    comped: 0,
                    paidSubscribed: 17,
                    paidCanceled: 1
                },
                {
                    date: '2022-05-02',
                    free: 7721,
                    tier1: 328,
                    tier2: 123,
                    paid: 451,
                    comped: 0,
                    paidSubscribed: 8,
                    paidCanceled: 1
                },
                {
                    date: '2022-05-03',
                    free: 7897,
                    tier1: 327,
                    tier2: 137,
                    paid: 464,
                    comped: 0,
                    paidSubscribed: 14,
                    paidCanceled: 1
                },
                {
                    date: '2022-05-04',
                    free: 7937,
                    tier1: 327,
                    tier2: 143,
                    paid: 470,
                    comped: 0,
                    paidSubscribed: 6,
                    paidCanceled: 0
                },
                {
                    date: '2022-05-05',
                    free: 7961,
                    tier1: 328,
                    tier2: 158,
                    paid: 486,
                    comped: 0,
                    paidSubscribed: 16,
                    paidCanceled: 0
                },
                {
                    date: '2022-05-06',
                    free: 8006,
                    tier1: 328,
                    tier2: 162,
                    paid: 490,
                    comped: 0,
                    paidSubscribed: 5,
                    paidCanceled: 1
                }
            ],
            labels: [
                '2022-04-07',
                '2022-04-08',
                '2022-04-09',
                '2022-04-10',
                '2022-04-11',
                '2022-04-12',
                '2022-04-13',
                '2022-04-14',
                '2022-04-15',
                '2022-04-16',
                '2022-04-17',
                '2022-04-18',
                '2022-04-19',
                '2022-04-20',
                '2022-04-21',
                '2022-04-22',
                '2022-04-23',
                '2022-04-24',
                '2022-04-25',
                '2022-04-26',
                '2022-04-27',
                '2022-04-28',
                '2022-04-29',
                '2022-04-30',
                '2022-05-01',
                '2022-05-02',
                '2022-05-03',
                '2022-05-04',
                '2022-05-05',
                '2022-05-06'
            ],
            data: [
                2925,
                3087,
                3487,
                3910,
                3915,
                4196,
                4566,
                4637,
                4814,
                5108,
                5307,
                5408,
                5799,
                6133,
                6403,
                6677,
                7053,
                7111,
                7242,
                7292,
                7596,
                7713,
                7856,
                7886,
                8065,
                8172,
                8361,
                8407,
                8447,
                8496
            ]
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
