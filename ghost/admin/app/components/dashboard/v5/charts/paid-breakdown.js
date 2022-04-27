import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const DATE_FORMAT = 'D MMM';

export default class PaidBreakdown extends Component {
    @service dashboardStats;
    @service feature;

    @action
    loadCharts() {
        // todo: load the new data here
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get chartTitle() {
        return 'Paid subscribers';
    }

    get chartType() {
        return 'bar';
    }

    get chartData() {
        const stats = this.dashboardStats.filledMemberCountStats;
        const labels = stats.map(stat => stat.date);
        const newData = stats.map(stat => stat.paidSubscribed);
        const canceledData = stats.map(stat => -stat.paidCanceled);
        const netData = stats.map(stat => stat.paidSubscribed - stat.paidCanceled);
        const barThickness = 5;

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
                    backgroundColor: '#8E42FF',
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
                    tooltipEl.style.top = tooltip.y + 'px';    
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        let newValue = data.datasets[1].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        document.querySelector('#gh-dashboard5-breakdown-tooltip .gh-dashboard5-tooltip-value-2').innerHTML = `New ${newValue}`;

                        let canceldValue = data.datasets[2].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        document.querySelector('#gh-dashboard5-breakdown-tooltip .gh-dashboard5-tooltip-value-3').innerHTML = `Canceled ${canceldValue}`;
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
