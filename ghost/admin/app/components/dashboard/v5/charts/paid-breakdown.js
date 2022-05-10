/* globals Chart */

import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const DATE_FORMAT = 'D MMM, YYYY';

// custom ChartJS draw function
Chart.defaults.hoverBar = Chart.defaults.bar;
Chart.controllers.hoverBar = Chart.controllers.bar.extend({
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

export default class PaidBreakdown extends Component {
    @service dashboardStats;
    @service feature;

    @action
    loadCharts() {
        this.dashboardStats.loadSubscriptionCountStats();
    }

    get loading() {
        return this.dashboardStats.subscriptionCountStats === null;
    }

    get chartTitle() {
        return 'Paid subscribers';
    }

    get chartType() {
        return 'hoverBar';
    }

    get chartData() {
        const stats = this.dashboardStats.filledSubscriptionCountStats;
        const labels = stats.map(stat => stat.date);
        const newData = stats.map(stat => stat.positiveDelta);
        const canceledData = stats.map(stat => -stat.negativeDelta);
        let barThickness = 5;

        if (newData.length > 30) {
            barThickness = 2;
        } else if (newData.length > 90) {   
            barThickness = 1;
        }

        return {
            labels: labels,
            datasets: [
                {
                    data: newData,
                    backgroundColor: '#8E42FF',
                    cubicInterpolationMode: 'monotone',
                    barThickness: barThickness,
                    minBarLength: 3
                }, {
                    data: canceledData,
                    backgroundColor: '#FB76B4',
                    cubicInterpolationMode: 'monotone',
                    barThickness: barThickness,
                    minBarLength: 3
                }]
        };
    }

    get chartOptions() {
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
                    top: 24,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            animation: {
                duration: 0
            },
            responsiveAnimationDuration: 0,
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'index',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard5-breakdown-tooltip');

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.display = 'none';
                        tooltipEl.style.opacity = 0;
                        return; 
                    }

                    // update tooltip styles
                    tooltipEl.style.display = 'block';
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x + 'px';
                    tooltipEl.style.top = '70px';    
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        // new data
                        let newValue = parseInt(data.datasets[0].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                        document.querySelector('#gh-dashboard5-breakdown-tooltip .gh-dashboard5-tooltip-value-1').innerHTML = `New ${newValue}`;

                        // canceld data
                        let canceledValue = Math.abs(parseInt(data.datasets[1].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')));
                        document.querySelector('#gh-dashboard5-breakdown-tooltip .gh-dashboard5-tooltip-value-2').innerHTML = `Canceled ${canceledValue}`;
                    },
                    title: (tooltipItems) => {
                        const value = moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        document.querySelector('#gh-dashboard5-breakdown-tooltip .gh-dashboard5-tooltip-label').innerHTML = value;
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
                        display: false,
                        drawBorder: false,
                        drawTicks: false,
                        zeroLineWidth: 1,
                        zeroLineColor: barColor,
                        zeroLineBorderDash: [4,4]
                    },
                    ticks: {
                        display: false
                    }
                }]
            }
        };
    }
}
