/* global Chart */

import Component from '@glimmer/component';
import moment from 'moment';
import {getSymbol} from 'ghost-admin/utils/currency';
import {ghPriceAmount} from '../../../helpers/gh-price-amount';
import {inject as service} from '@ember/service';

const DATE_FORMAT = 'D MMM, YYYY';

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

export default class PaidMrr extends Component {
    @service dashboardStats;
    @service feature;

    get loading() {
        return this.dashboardStats.mrrStats === null;
    }

    get currentMRR() {
        return this.dashboardStats.currentMRR ?? 0;
    }

    get mrrTrend() {
        return this.calculatePercentage(this.dashboardStats.currentMRRTrend, this.dashboardStats.currentMRR);
    }

    get hasTrends() {
        return this.dashboardStats.currentMRR !== null
            && this.dashboardStats.currentMRRTrend !== null;
    }

    get chartTitle() {
        return 'MRR';
    }

    get chartType() {
        return 'hoverLine'; // uses custom ChartJS draw function
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts && this.totalMembers === 0;
    }

    get mrrCurrencySymbol() {
        if (this.dashboardStats.mrrStats === null) {
            return '';
        }
        
        const firstCurrency = this.dashboardStats.mrrStats[0] ? this.dashboardStats.mrrStats[0].currency : 'usd';
        return getSymbol(firstCurrency);
    }

    get currentMRRFormatted() {
        // fake empty data
        if (this.isTotalMembersZero) {
            return '$123';
        }

        if (this.dashboardStats.mrrStats === null) {
            return '-';
        }

        const valueText = ghPriceAmount(this.currentMRR, {cents: false});
        return `${this.mrrCurrencySymbol}${valueText}`;
    }

    get chartData() {
        let stats = this.dashboardStats.filledMrrStats;
        let labels = stats.map(stat => stat.date);
        let data = stats.map(stat => stat.mrr);

        // with no members yet, let's show empty state with dummy data
        if (this.isTotalMembersZero) {
            stats = this.emptyData.stats;
            labels = this.emptyData.labels;
            data = this.emptyData.data;
        }

        // gradient for fill
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 120);
        gradient.addColorStop(0, 'rgba(143, 66, 255, 0.15'); 
        gradient.addColorStop(1, 'rgba(143, 66, 255, 0.0');

        return {
            labels: labels,
            datasets: [{
                data: data,
                tension: 1,
                cubicInterpolationMode: 'monotone',
                fill: false,
                fillColor: gradient,
                backgroundColor: gradient,
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

    get chartOptions() {
        const that = this;
        const barColor = this.feature.nightShift ? 'rgba(200, 204, 217, 0.25)' : 'rgba(200, 204, 217, 0.65)';

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
                    left: 0,
                    right: 0
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            animation: false,
            responsiveAnimationDuration: 1,
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'index',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard-mrr-tooltip');
                    const chartContainerEl = tooltipEl.parentElement;
                    const chartWidth = chartContainerEl.offsetWidth;
                    const tooltipWidth = tooltipEl.offsetWidth;

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return; 
                    }

                    let offsetX = 0;
                    if (tooltip.x > chartWidth - tooltipWidth) {
                        offsetX = tooltipWidth - 10;
                    }

                    // update tooltip styles
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x - offsetX + 'px';
                    tooltipEl.style.top = tooltip.y + 'px';    
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const value = `${that.mrrCurrencySymbol}${ghPriceAmount(data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index], {cents: false})}`;
                        document.querySelector('#gh-dashboard-mrr-tooltip .gh-dashboard-tooltip-value .value').innerHTML = value;
                    },
                    title: (tooltipItems) => {
                        const value = moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        document.querySelector('#gh-dashboard-mrr-tooltip .gh-dashboard-tooltip-label').innerHTML = value;
                    }
                }
            },
            scales: {
                yAxes: [{
                    display: true,
                    gridLines: {
                        drawTicks: false,
                        display: false,
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
                        display: false,
                        drawBorder: true,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: barColor,
                        zeroLineBorderDash: [4,4]
                    },
                    ticks: {
                        display: false,
                        beginAtZero: true
                    }
                }]
            }
        };
    }

    // used for empty state
    get emptyData() {
        return {
            stats: [
                {
                    date: '2022-04-07',
                    mrr: 0,
                    currency: 'usd'
                },
                {
                    date: '2022-04-08',
                    mrr: 0,
                    currency: 'usd'
                },
                {
                    date: '2022-04-09',
                    mrr: 1500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-10',
                    mrr: 2000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-11',
                    mrr: 4500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-12',
                    mrr: 7500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-13',
                    mrr: 11000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-14',
                    mrr: 12500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-15',
                    mrr: 14500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-16',
                    mrr: 18000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-17',
                    mrr: 21500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-18',
                    mrr: 25000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-19',
                    mrr: 28000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-20',
                    mrr: 30000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-21',
                    mrr: 34000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-22',
                    mrr: 35000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-23',
                    mrr: 35500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-24',
                    mrr: 37000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-25',
                    mrr: 38000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-26',
                    mrr: 40500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-27',
                    mrr: 43500,
                    currency: 'usd'
                },
                {
                    date: '2022-04-28',
                    mrr: 47000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-29',
                    mrr: 48000,
                    currency: 'usd'
                },
                {
                    date: '2022-04-30',
                    mrr: 50500,
                    currency: 'usd'
                },
                {
                    date: '2022-05-01',
                    mrr: 53500,
                    currency: 'usd'
                },
                {
                    date: '2022-05-02',
                    mrr: 55000,
                    currency: 'usd'
                },
                {
                    date: '2022-05-03',
                    mrr: 56500,
                    currency: 'usd'
                },
                {
                    date: '2022-05-04',
                    mrr: 57000,
                    currency: 'usd'
                },
                {
                    date: '2022-05-05',
                    mrr: 58000,
                    currency: 'usd'
                },
                {
                    date: '2022-05-06',
                    mrr: 58500,
                    currency: 'usd'
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
                0,
                1500,
                4000,
                5000,
                9000,
                11500,
                22500,
                26000,
                30000,
                30000,
                31000,
                33000,
                33500,
                35500,
                36500,
                36500,
                40000,
                40500,
                43500,
                47000,
                49000,
                49500,
                50000,
                50000,
                53000,
                56000,
                58000,
                61000,
                63500,
                63500
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
