/* globals Chart */

import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const MODE_OPTIONS = [{
    name: 'Cadence',
    value: 'cadence'
}, {
    name: 'Tiers',
    value: 'tiers'
}];

// Custom ChartJS rounded rectangle
Chart.elements.Rectangle.prototype.draw = function () {
    var ctx = this._chart.ctx;
    var vm = this._view;
    var left, right, top, bottom, borderSkipped, radius;

    // If radius is less than 0 or is large enough to cause drawing errors a max
    // radius is imposed. If cornerRadius is not defined set it to 0.
    var cornerRadius = this._chart.config.options.cornerRadius;
    var fullCornerRadius = this._chart.config.options.fullCornerRadius;
    var stackedRounded = this._chart.config.options.stackedRounded;
    var typeOfChart = this._chart.config.type;

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

    if (!vm.horizontal) {
        // bar
        left = vm.x - vm.width / 2;
        right = vm.x + vm.width / 2;
        top = vm.y;
        bottom = vm.base;
        borderSkipped = vm.borderSkipped || 'bottom';
    } else {
        // horizontal bar
        left = vm.base;
        right = vm.x;
        top = vm.y - vm.height / 2;
        bottom = vm.y + vm.height / 2;
        borderSkipped = vm.borderSkipped || 'left';
    }
    
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
        if (width < 0) {
            // Negative values in a horizontal bar chart
            xTL = x + width;
            xTR = x;
            yTL = y;
            yTR = y;

            xBL = x + width;
            xBR = x;
            yBL = y + height;
            yBR = y + height;

            // Draw
            ctx.moveTo(xBL + radius, yBL);
            ctx.lineTo(xBR - radius, yBR);

            //  Bottom right corner
            fullCornerRadius ? ctx.quadraticCurveTo(xBR, yBR, xBR, yBR - radius) : ctx.lineTo(xBR, yBR, xBR, yBR - radius);
            ctx.lineTo(xTR, yTR + radius);

            // top right Corner
            fullCornerRadius ? ctx.quadraticCurveTo(xTR, yTR, xTR - radius, yTR) : ctx.lineTo(xTR, yTR, xTR - radius, yTR);
            ctx.lineTo(xTL + radius, yTL);

            // top left corner
            ctx.quadraticCurveTo(xTL, yTL, xTL, yTL + radius);
            ctx.lineTo(xBL, yBL - radius);

            //  bttom left corner
            ctx.quadraticCurveTo(xBL, yBL, xBL + radius, yBL);
        } else {
            var lastVisible = 0;
            for (var findLast = 0, findLastTo = this._chart.data.datasets.length; findLast < findLastTo; findLast++) {
                if (!this._chart.getDatasetMeta(findLast).hidden) {
                    lastVisible = findLast;
                }
            }
            var rounded = this._datasetIndex === lastVisible;

            if (rounded) {
                //Positive Value
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);

                // top right
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);

                // bottom right
                if (fullCornerRadius || typeOfChart === 'horizontalBar') {
                    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                } else {
                    ctx.lineTo(x + width, y + height, x + width - radius, y + height);
                }

                ctx.lineTo(x + radius, y + height);

                // bottom left
                if (fullCornerRadius) {
                    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                } else {
                    ctx.lineTo(x, y + height, x, y + height - radius);
                }

                ctx.lineTo(x, y + radius);

                // top left
                if (fullCornerRadius || typeOfChart === 'bar') {
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                } else {
                    ctx.lineTo(x, y, x + radius, y);
                }
            } else {
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x, y);
            }
        }
    }

    ctx.fill();
};

export default class PaidMix extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        this.dashboardStats.loadMemberCountStats();
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        if (this.mode === 'cadence') {
            this.dashboardStats.loadPaidMembersByCadence();
        } else {
            this.dashboardStats.loadPaidMembersByTier();
        }
    }

    @tracked mode = 'cadence';
    modeOptions = MODE_OPTIONS;

    get selectedModeOption() {
        return this.modeOptions.find(option => option.value === this.mode);
    }

    get hasMultipleTiers() {
        return this.dashboardStats.siteStatus?.hasMultipleTiers;
    } 

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts?.total === 0;
    }

    @action 
    onSwitchMode(selected) {
        this.mode = selected.value;

        if (this.loading) {
            // We don't have the data yet for the newly selected mode
            this.loadCharts();
        }
    }

    get loading() {
        if (this.mode === 'cadence') {
            return this.dashboardStats.paidMembersByCadence === null;
        }
        return this.dashboardStats.paidMembersByTier === null;
    }
    
    get chartType() {
        return 'horizontalBar';
    }

    get areTiersAllZero() {
        if (this.dashboardStats.paidMembersByTier === null || this.dashboardStats.paidMembersByTier.length === 0) {
            return true;
        }
        const data = this.dashboardStats.paidMembersByTier.map(stat => stat.members);
        let areAllTiersZero = true;
        for (let i = 0; i < data.length; i++) {
            if (data[i] > 0) {
                areAllTiersZero = false;
            }
        }
        return areAllTiersZero;
    }

    get chartData() {
        const totalCadence = this.dashboardStats.paidMembersByCadence.month + this.dashboardStats.paidMembersByCadence.year;
        const monthlyPercentage = Math.round(this.dashboardStats.paidMembersByCadence.month / totalCadence * 100);
        const annualPercentage = Math.round(this.dashboardStats.paidMembersByCadence.year / totalCadence * 100);
        const barThickness = 5;

        if (this.mode === 'cadence') {    
            // there has to be negative values to make rounded corners work
            // empty chart render when there is no data
            if (totalCadence === 0 && !this.isTotalMembersZero) {
                return {
                    labels: ['Cadence'],
                    datasets: [{
                        label: 'Monthly',
                        data: [-50],
                        backgroundColor: '#F3F6F8',
                        barThickness
                    },{
                        label: 'Annual',
                        data: [50],
                        backgroundColor: '#EBEEF0',
                        barThickness
                    }]
                };

            // fake colorful data for underneath empty state
            } else if (this.isTotalMembersZero) {
                return {
                    labels: ['Cadence'],
                    datasets: [{
                        label: 'Monthly',
                        data: [-40],
                        backgroundColor: '#8E42FF',
                        barThickness
                    },{
                        label: 'Annual',
                        data: [60],
                        backgroundColor: '#FB76B4',
                        barThickness
                    }]
                };
            }

            return {
                labels: ['Cadence'],
                datasets: [{
                    label: 'Monthly',
                    data: [-monthlyPercentage],
                    backgroundColor: '#8E42FF',
                    barThickness
                }, {
                    label: 'Annual',
                    data: [annualPercentage],
                    backgroundColor: '#FB76B4',
                    barThickness
                }]
            };
        }

        // if it's for tiers...
        const labels = this.dashboardStats.paidMembersByTier.map(stat => stat.tier.name);
        const data = this.dashboardStats.paidMembersByTier.map(stat => stat.members);
        const colors = ['#853EED', '#CA3FED', '#E993CC', '#DB7777', '#EE9696', '#FEC7C0', '#853EED', '#CA3FED', '#E993CC', '#DB7777', '#EE9696', '#FEC7C0'];
        const zeroColors = ['#E6E9EB', '#EEF1F2', '#F6F8FA', '#EEF1F2', '#E6E9EB', '#EEF1F2', '#F6F8FA', '#EEF1F2', '#E6E9EB', '#EEF1F2', '#F6F8FA', '#EEF1F2'];
        let datasets = [];
        let totalTiersAmount;

        // tiers all have 0 data
        if (this.areTiersAllZero) {
            totalTiersAmount = 100;
            let equalPercentageData = Math.round(100 / data.length);
            for (let i = 0; i < data.length; i++) {
                data[i] = equalPercentageData;
            }
        // tiers have good data
        } else {
            totalTiersAmount = 0;
            for (let i = 0; i < data.length; i++) {
                totalTiersAmount += data[i];
            }
        }

        for (let i = 0; i < data.length; i++) {
            if (!this.areTiersAllZero && data[i] === 0) {
                // If not all tiers are zero, hide tiers with 0 members, because
                // they are not visible in the graph and can break rounded corners
                continue;
            }

            let tierPercentage = Math.round(data[i] / totalTiersAmount * 100);

            // The first value has to be negative to make rounded corners work
            if (i === 0) { 
                tierPercentage = -tierPercentage;
            }
            datasets.push({
                data: [tierPercentage],
                label: labels[i],
                backgroundColor: this.areTiersAllZero ? zeroColors[i] : colors[i],
                barThickness
            });
        }

        return {
            labels: ['Tiers'],
            datasets
        };
    }

    get chartOptions() {
        let that = this;
        let ticksY = {display: false};
        let totalCadence = this.dashboardStats.paidMembersByCadence.month + this.dashboardStats.paidMembersByCadence.year;
        let minTickValue = -(Math.round(this.dashboardStats.paidMembersByCadence.month / totalCadence * 100));
        let maxTickValue = Math.round(this.dashboardStats.paidMembersByCadence.year / totalCadence * 100);

        // this is for cadence...
        if (this.mode === 'cadence') {
            // for when it's empty
            if (totalCadence === 0) {
                minTickValue = -50;
                maxTickValue = 50;
            }

            ticksY = {
                display: false,
                min: minTickValue,
                max: maxTickValue
            };

        // this is for tiers...
        } else {
            if (!this.areTiersAllZero) {
                let data = this.dashboardStats.paidMembersByTier.map(stat => stat.members);
                let totalTiersAmount = 0;

                for (let i = 0; i < data.length; i++) {
                    totalTiersAmount += data[i];
                }

                let negativeTierPercentage = Math.round(data[0] / totalTiersAmount * 100);

                ticksY = {
                    display: false,
                    min: -negativeTierPercentage,
                    max: 100 - negativeTierPercentage // take the negative away from 100 to create a full width bar
                };
            }
        }

        return {
            responsive: true,
            maintainAspectRatio: false,
            cornerRadius: 50,
            fullCornerRadius: false,
            legend: {
                display: false
            },
            layout: {
                padding: {
                    top: 72,
                    bottom: 0,
                    left: 0,
                    right: 4
                }
            },
            animation: false,
            responsiveAnimationDuration: 1,
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'single',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard-mix-tooltip');
                    const chartContainerEl = tooltipEl.parentElement;
                    const chartWidth = chartContainerEl.offsetWidth;
                    const tooltipWidth = tooltipEl.offsetWidth;

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return; 
                    }

                    let offsetX = 0;

                    if (that.mode === 'cadence') {
                        // these adjustments should match the special width and margin values in css
                        if (tooltip.x > (chartWidth * 0.69) - tooltipWidth) {
                            offsetX = tooltipWidth - 10;
                        }
                        offsetX -= (chartWidth * 0.30);
                    } else {
                        if (tooltip.x > chartWidth - tooltipWidth) {
                            offsetX = tooltipWidth - 10;
                        } 
                    }

                    // update tooltip styles
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x - offsetX + 'px';
                    tooltipEl.style.top = '30px';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const tooltipTextEl = document.querySelector('#gh-dashboard-mix-tooltip .gh-dashboard-tooltip-value');
                        const label = data.datasets[tooltipItems.datasetIndex].label || '';
                        var value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                        if (value < 0) {
                            value = -value;
                        }
                        if (that.isTotalMembersZero || totalCadence === 0) {
                            value = 0;
                        } else {
                            value += '%';
                        }
                        tooltipTextEl.innerHTML = `<span class="indicator solid" style="background-color: ${data.datasets[tooltipItems.datasetIndex].backgroundColor}"></span><span class="metric">${label}</span><span class="value">${value}</span>`;
                    },
                    title: () => {
                        return null;
                    }
                }
            },
            scales: {
                yAxes: [{
                    stacked: true,
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                }],
                xAxes: [{
                    stacked: true,
                    gridLines: {
                        display: false
                    },
                    ticks: ticksY
                }]
            }
        };
    }

    get isChartCadence() {
        return (this.mode === 'cadence');
    }

    get isChartTiers() {
        return (this.mode === 'tiers');
    }
}
