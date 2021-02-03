/* global Chart */
import Component from '@ember/component';
import moment from 'moment';
import {action} from '@ember/object';
import {computed, get} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const DATE_FORMAT = 'D MMM YYYY';

export default Component.extend({
    ajax: service(),
    membersStats: service(),

    // public attrs
    nightShift: false,

    stats: null,
    chartData: null,
    chartOptions: null,

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
        if (this._lastNightShift !== undefined && this.nightShift !== this._lastNightShift) {
            this.setChartOptions();
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
        this.set('stats', null);

        let stats = yield this.membersStats.fetch();

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
    }),

    // Internal ----------------------------------------------------------------

    setChartData({dateLabels, dateValues}) {
        this.set('chartData', {
            labels: dateLabels,
            datasets: [{
                label: 'Total members',
                cubicInterpolationMode: 'monotone',
                data: dateValues,
                fill: false,
                backgroundColor: 'rgba(181,255,24,1.0)',
                pointRadius: 0,
                pointHitRadius: 10,
                borderColor: 'rgba(181,255,24,1.0)',
                borderJoinStyle: 'miter'
            }]
        });
    },

    setChartOptions({rangeInDays}) {
        let maxTicksAllowed = this.getTicksForRange(rangeInDays);

        this.setChartJSDefaults();

        this.set('chartOptions', {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 5, // Needed otherwise the top dot is cut
                    right: 10,
                    bottom: 5,
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
                backgroundColor: '#343f44',
                xPadding: 7,
                yPadding: 7,
                cornerRadius: 5,
                caretSize: 7,
                caretPadding: 5,
                bodyFontSize: 13,
                titleFontStyle: 'normal',
                titleFontColor: 'rgba(255, 255, 255, 0.7)',
                titleMarginBottom: 4,
                callbacks: {
                    label: function (tooltipItems, data) {
                        return data.datasets[0].label + `: ` + data.datasets[0].data[tooltipItems.index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    },
                    title: function (tooltipItems) {
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
                        color: (this.nightShift ? '#333F44' : '#3E3F41'),
                        zeroLineColor: (this.nightShift ? '#333F44' : '#3E3F41')
                    },
                    ticks: {
                        display: false,
                        maxRotation: 0,
                        minRotation: 0,
                        padding: 6,
                        autoSkip: false,
                        maxTicksLimit: 10,
                        callback: function (value, index, values) {
                            let step = (values.length - 1) / (maxTicksAllowed);
                            let steps = [];
                            for (let i = 0; i < maxTicksAllowed; i++) {
                                steps.push(Math.round(i * step));
                            }

                            if (index === 0) {
                                return value;
                            }
                            if (index === (values.length - 1)) {
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
                        fontColor: '#9baeb8',
                        padding: 8,
                        precision: 0,
                        callback: function (value) {
                            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        }
                    }
                }]
            }
        });
    },

    getTicksForRange(rangeInDays) {
        if (rangeInDays <= 30) {
            return 6;
        } else if (rangeInDays <= 90) {
            return 18;
        } else {
            return 24;
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
