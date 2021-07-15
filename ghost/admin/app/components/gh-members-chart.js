/* global Chart */
import Component from '@ember/component';
import moment from 'moment';
import {action} from '@ember/object';
import {computed, get} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const DATE_FORMAT = 'D MMM YYYY';

export default Component.extend({
    ajax: service(),
    membersStats: service(),

    // public attrs
    nightShift: false,
    lineColor: '#14b8ff',

    stats: null,
    tagName: '',
    chartStats: null,
    chartData: null,
    chartOptions: null,
    showSummary: true,
    showRange: true,
    chartType: '',
    chartSize: '',
    chartHeading: 'Total members',

    isSmall: computed('chartSize', function () {
        if (this.chartSize === 'small') {
            return true;
        }
        return false;
    }),

    startDateLabel: computed('membersStats.stats', function () {
        if (!this.membersStats?.stats?.total_on_date) {
            return '';
        }

        let firstDate = Object.keys(this.membersStats.stats.total_on_date)[0];
        return moment(firstDate).format(DATE_FORMAT);
    }),

    selectedRange: computed('membersStats.days', function () {
        const availableRanges = this.availableRanges;
        return availableRanges.findBy('days', this.membersStats.days);
    }),

    availableRanges: computed(function () {
        return [{
            name: '30 days',
            days: '30'
        }, {
            name: '90 days',
            days: '90'
        }, {
            name: '365 days',
            days: '365'
        }, {
            name: 'All time',
            days: 'all-time'
        }];
    }),

    // Lifecycle ---------------------------------------------------------------

    init() {
        this._super(...arguments);
        this.setChartJSDefaults();
    },

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.chartStats) {
            const {options, data, title, stats} = this.chartStats;

            this.set('stats', stats);
            this.set('chartHeading', title);
            this.setChartData(data);
            this.setChartOptions(options);
        }

        if (this._lastNightShift !== undefined && this.nightShift !== this._lastNightShift) {
            const {options = {}} = this.chartStats;

            this.setChartOptions(options);
        }
        this._lastNightShift = this.nightShift;
    },

    // Actions -----------------------------------------------------------------

    changeDateRange: action(function (range) {
        this.membersStats.days = get(range, 'days');
        this.fetchStatsTask.perform();
    }),

    // Tasks -------------------------------------------------------------------

    fetchStatsTask: task(function* () {
        let stats;
        if (!this.chartType) {
            this.set('stats', null);
            stats = yield this.membersStats.fetch();
            this.setOriginalChartData(stats);
        }
    }),

    setOriginalChartData(stats) {
        if (stats) {
            this.set('stats', stats);

            this.setChartOptions({
                rangeInDays: Object.keys(stats.total_on_date).length
            });

            this.setChartData({
                dateLabels: Object.keys(stats.total_on_date),
                dateValues: Object.values(stats.total_on_date)
            });
        }
    },

    // Internal ----------------------------------------------------------------

    setChartData({dateLabels, dateValues, label = 'Total Members'}) {
        let backgroundColors = this.lineColor;

        if (this.chartType === 'open-rate') {
            backgroundColors = dateLabels.map((val) => {
                if (val) {
                    return this.lineColor;
                } else {
                    return (this.nightShift ? '#7C8B9A' : '#CED4D9');
                }
            });
        }

        this.set('chartData', {
            labels: dateLabels,
            datasets: [{
                label: label,
                cubicInterpolationMode: 'monotone',
                data: dateValues,
                fill: false,
                backgroundColor: backgroundColors,
                pointRadius: 0,
                pointHitRadius: 10,
                borderColor: this.lineColor,
                borderJoinStyle: 'miter',
                maxBarThickness: 20,
                minBarLength: 2
            }]
        });
    },

    setChartOptions({rangeInDays}) {
        let maxTicksAllowed = this.isSmall ? 3 : this.getTicksForRange(rangeInDays);

        if (this.chartType === 'open-rate') {
            maxTicksAllowed = 0;
        }

        this.setChartJSDefaults();
        let options = {
            responsive: true,
            responsiveAnimationDuration: 5,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: (this.isSmall ? 20 : 5), // Needed otherwise the top dot is cut
                    right: 10,
                    bottom: (this.isSmall ? 20 : 5),
                    left: 10
                }
            },
            title: {
                display: false
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
                filter: (tooltipItems, data) => {
                    if (this.chartType === 'open-rate') {
                        let label = data.labels[tooltipItems.index];
                        if (label === '') {
                            return false;
                        }
                    }
                    return true;
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const labelText = data.datasets[tooltipItems.datasetIndex].label;
                        let valueText = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        if (this.chartType === 'mrr') {
                            const currency = getSymbol(this.stats.currency);
                            valueText = `${currency}${valueText}`;
                        }
                        if (this.chartType === 'open-rate') {
                            valueText = `${valueText}%`;
                        }
                        return `${labelText}: ${valueText}`;
                    },
                    title: (tooltipItems) => {
                        if (this.chartType === 'open-rate') {
                            if (tooltipItems.length) {
                                return tooltipItems[0].xLabel;
                            } else {
                                return '';
                            }
                        }
                        return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                    }
                }
            },
            hover: {
                mode: 'index',
                intersect: false,
                animationDuration: 120
            },
            legend: {
                display: false
            },
            scales: {
                xAxes: [{
                    labelString: 'Date',
                    gridLines: {
                        drawTicks: false,
                        color: (this.nightShift ? '#333F44' : '#DDE1E5'),
                        zeroLineColor: (this.nightShift ? '#333F44' : '#DDE1E5')
                    },
                    ticks: {
                        display: false,
                        maxRotation: 0,
                        minRotation: 0,
                        padding: 6,
                        autoSkip: false,
                        fontColor: '#626D79',
                        maxTicksLimit: 10,
                        callback: (value, index, values) => {
                            let step = (values.length - 1) / (maxTicksAllowed);
                            let steps = [];
                            for (let i = 0; i < maxTicksAllowed; i++) {
                                steps.push(Math.ceil(i * step));
                            }

                            if (index === 0) {
                                return value;
                            }
                            if (index === (values.length - 1) && this.chartType !== 'open-rate') {
                                return 'Today';
                            }

                            if (steps.includes(index)) {
                                return '';
                            }
                        }
                    }
                }],
                yAxes: [{
                    gridLines: {
                        drawTicks: false,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        maxTicksLimit: 5,
                        fontColor: '#7C8B9A',
                        padding: 8,
                        precision: 0,
                        callback: (value) => {
                            const currency = this.chartType === 'mrr' ? getSymbol(this.stats.currency) : '';
                            if (parseInt(value) >= 1000) {
                                return currency + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                            } else {
                                return currency + value;
                            }
                        }
                    }
                }]
            }
        };

        if (this.chartType === 'mrr' || this.chartType === 'all-members') {
            const chartData = this.get('chartData').datasets[0].data;
            let allZeros = true;
            for (let i = 0; i < chartData.length; i++) {
                const element = chartData[i];
                if (element !== 0) {
                    allZeros = false;
                    break;
                }
            }
            if (allZeros) {
                options.scales.yAxes[0].ticks.suggestedMin = 0;
                options.scales.yAxes[0].ticks.suggestedMax = 100;
            }
        }

        if (this.chartType === 'open-rate') {
            options.scales.yAxes[0].ticks.suggestedMin = 0;
        }

        if (this.isSmall) {
            options.scales.yAxes[0].ticks.display = false;
            options.scales.xAxes[0].gridLines.display = true;
        }
        this.set('chartOptions', options);
    },

    getTicksForRange(rangeInDays) {
        if (rangeInDays <= 30) {
            return 5;
        } else if (rangeInDays <= 90) {
            return 10;
        } else {
            return 15;
        }
    },

    setChartJSDefaults() {
        Chart.defaults.LineWithLine = Chart.defaults.line;
        Chart.controllers.LineWithLine = Chart.controllers.line.extend({
            draw: function (ease) {
                Chart.controllers.line.prototype.draw.call(this, ease);

                if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
                    let activePoint = this.chart.tooltip._active[0];
                    let ctx = this.chart.ctx;
                    let x = activePoint.tooltipPosition().x;
                    let topY = this.chart.scales['y-axis-0'].top;
                    let bottomY = this.chart.scales['y-axis-0'].bottom;

                    // draw line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = (this.nightShift ? 'rgba(62, 176, 239, 0.65)' : 'rgba(62, 176, 239, 0.1)');
                    ctx.stroke();
                    ctx.restore();
                }
            }
        });
    }
});
