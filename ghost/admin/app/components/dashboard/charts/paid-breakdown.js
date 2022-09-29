/* globals Chart */

import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const DATE_FORMAT = 'D MMM, YYYY';

// Custom ChartJS rounded rectangle
Chart.elements.RoundedRectangle = Chart.elements.Rectangle.extend({
    draw: function () {
        var ctx = this._chart.ctx;
        var vm = this._view;
        var left, right, top, bottom, borderSkipped, radius;

        // If radius is less than 0 or is large enough to cause drawing errors a max
        // radius is imposed. If cornerRadius is not defined set it to 0.
        var cornerRadius = this._chart.config.options.cornerRadius;
        var fullCornerRadius = this._chart.config.options.fullCornerRadius;
        var stackedRounded = this._chart.config.options.stackedRounded;

        if (cornerRadius < 0) {
            cornerRadius = 0;
        }
        if (typeof cornerRadius === 'undefined') {
            cornerRadius = 0;
        }
        if (typeof fullCornerRadius === 'undefined') {
            fullCornerRadius = true;
        }
        if (typeof stackedRounded === 'undefined') {
            stackedRounded = false;
        }

        left = vm.x - vm.width / 2;
        right = vm.x + vm.width / 2;
        top = vm.y;
        bottom = vm.base;
        borderSkipped = vm.borderSkipped || 'bottom';

        ctx.beginPath();
        ctx.fillStyle = vm.backgroundColor;
        ctx.strokeStyle = vm.borderColor;

        // Corner points, from bottom-left to bottom-right clockwise
        // | 1 2 |
        // | 0 3 |
        var corners = [
            [left, bottom],
            [left, top],
            [right, top],
            [right, bottom]
        ];

        // Find first (starting) corner with fallback to 'bottom'
        var borders = ['bottom', 'left', 'top', 'right'];
        var startCorner = borders.indexOf(borderSkipped, 0);
        if (startCorner === -1) {
            startCorner = 0;
        }

        function cornerAt(index) {
            return corners[(startCorner + index) % 4];
        }

        // Draw rectangle from 'startCorner'
        var corner = cornerAt(0);
        ctx.moveTo(corner[0], corner[1]);

        var nextCornerId, width, height, x, y;
        for (var i = 1; i < 4; i++) {
            corner = cornerAt(i);
            nextCornerId = i + 1;
            if (nextCornerId === 4) {
                nextCornerId = 0;
            }

            width = corners[2][0] - corners[1][0];
            height = corners[0][1] - corners[1][1];
            x = corners[1][0];
            y = corners[1][1];

            radius = cornerRadius;
            // Fix radius being too large
            if (radius > Math.abs(height) / 2) {
                radius = Math.floor(Math.abs(height) / 2);
            }
            if (radius > Math.abs(width) / 2) {
                radius = Math.floor(Math.abs(width) / 2);
            }

            var xTL, xTR, yTL, yTR, xBL, xBR, yBL, yBR;
            if (height < 0) {
                // Negative values in a standard bar chart
                xTL = x;
                xTR = x + width;
                yTL = y + height;
                yTR = y + height;

                xBL = x;
                xBR = x + width;
                yBL = y;
                yBR = y;

                // Draw
                ctx.moveTo(xBL + radius, yBL);
                ctx.lineTo(xBR - radius, yBR);

                // bottom right
                ctx.quadraticCurveTo(xBR, yBR, xBR, yBR - radius);
                ctx.lineTo(xTR, yTR + radius);

                // top right
                ctx.lineTo(xTR, yTR, xTR - radius, yTR);
                ctx.lineTo(xTL + radius, yTL);

                // top left
                ctx.lineTo(xTL, yTL, xTL, yTL + radius);
                ctx.lineTo(xBL, yBL - radius);

                //  bottom left
                ctx.quadraticCurveTo(xBL, yBL, xBL + radius, yBL);
            } else {
                // Positive values in a standard bar chart
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);

                // top right
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);

                // bottom right
                ctx.lineTo(x + width, y + height, x + width - radius, y + height);

                ctx.lineTo(x + radius, y + height);
                ctx.lineTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);

                // top left
                ctx.quadraticCurveTo(x, y, x + radius, y);
            }
        }

        ctx.fill();
    }
});

Chart.defaults.hoverBar = Chart.defaults.bar;
Chart.controllers.hoverBar = Chart.controllers.bar.extend({
    draw: function (ease) {
        Chart.controllers.bar.prototype.draw.call(this, ease);

        var ctx = this.chart.ctx;

        if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
            let activePoint = this.chart.tooltip._active[0],
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
    },
    dataElementType: Chart.elements.RoundedRectangle
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
        const newData = stats.map(stat => stat.signups || 0);
        const canceledData = stats.map(stat => -(stat.cancellations || 0));
        let barThickness = 5;

        if (newData.length >= 30 + 1 && newData.length < 90) {
            barThickness = 3.5;
        } else if (newData.length >= 90) {
            barThickness = 1.5;
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
            cornerRadius: 50,
            fullCornerRadius: false,
            maintainAspectRatio: false,
            title: {
                display: false
            },
            legend: {
                display: false
            },
            layout: {
                padding: {
                    top: 4,
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
            animation: false,
            responsiveAnimationDuration: 1,
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'index',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard-breakdown-tooltip');
                    const chartContainerEl = tooltipEl.parentElement;
                    const chartWidth = chartContainerEl.offsetWidth;
                    const tooltipWidth = tooltipEl.offsetWidth;

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.display = 'none';
                        tooltipEl.style.opacity = 0;
                        return;
                    }

                    let offsetX = 0;
                    if (tooltip.x > chartWidth - tooltipWidth) {
                        offsetX = tooltipWidth - 10;
                    }

                    // update tooltip styles
                    tooltipEl.style.display = 'block';
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x - offsetX + 120 + 'px';
                    tooltipEl.style.top = '70px';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        // new data
                        let newValue = parseInt(data.datasets[0].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                        document.querySelector('#gh-dashboard-breakdown-tooltip .gh-dashboard-tooltip-value-1 .value').innerHTML = `${newValue}`;

                        // canceld data
                        let canceledValue = Math.abs(parseInt(data.datasets[1].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')));
                        document.querySelector('#gh-dashboard-breakdown-tooltip .gh-dashboard-tooltip-value-2 .value').innerHTML = `${canceledValue}`;
                    },
                    title: (tooltipItems) => {
                        const value = moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                        document.querySelector('#gh-dashboard-breakdown-tooltip .gh-dashboard-tooltip-label').innerHTML = value;
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
