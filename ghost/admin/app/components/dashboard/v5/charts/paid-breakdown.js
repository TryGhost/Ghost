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
                    top: 8,
                    bottom: 0,
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
                yAlign: 'center',
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

    get chartHeight() {
        return 120;
    }
}
