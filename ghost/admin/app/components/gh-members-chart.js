/* global Chart */
import Component from '@ember/component';
import moment from 'moment';
import {computed, get} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    members: null,
    range: '30',
    selectedRange: computed('range', function () {
        const availableRange = this.get('availableRange');
        return availableRange.findBy('days', this.get('range'));
    }),
    availableRange: computed(function () {
        return [
            {
                name: '30 days',
                days: '30'
            },
            {
                name: '90 days',
                days: '90'
            },
            {
                name: '365 days',
                days: '365'
            },
            {
                name: 'All time',
                days: 'all-time'
            }
        ];
    }),

    subData: computed('members.@each', 'range', 'feature.nightShift', function () {
        let isNightShiftEnabled = this.feature.nightShift;
        let {members, range} = this;
        let rangeInDays, rangeStartDate, rangeEndDate;
        if (range === 'last-year') {
            rangeStartDate = moment().startOf('year').subtract(1, 'year');
            rangeEndDate = moment().endOf('year').subtract(1, 'year').subtract(1, 'day');
            rangeInDays = rangeEndDate.diff(rangeStartDate, 'days');
        } else if (range === 'all-time') {
            let firstMemberCreatedDate = members.length ? members.lastObject.get('createdAtUTC') : moment().subtract(365, 'days');
            rangeStartDate = moment(firstMemberCreatedDate);
            rangeEndDate = moment();
            rangeInDays = rangeEndDate.diff(rangeStartDate, 'days');
            if (rangeInDays < 5) {
                rangeStartDate = moment().subtract(6, 'days');
                rangeInDays = rangeEndDate.diff(rangeStartDate, 'days');
            }
            let step = this.getTicksForRange(rangeInDays);
            rangeInDays = Math.ceil(rangeInDays / step) * step;
            rangeStartDate = moment().subtract(rangeInDays, 'days');
        } else {
            rangeInDays = parseInt(range);
            rangeStartDate = moment().subtract((rangeInDays), 'days');
            rangeEndDate = moment();
        }
        let totalSubs = members.length || 0;
        let totalSubsLastMonth = members.filter((member) => {
            let isValid = moment(member.createdAtUTC).isSameOrAfter(rangeStartDate, 'day');
            return isValid;
        }).length;

        let totalSubsToday = members.filter((member) => {
            let isValid = moment(member.createdAtUTC).isSame(moment(), 'day');
            return isValid;
        }).length;

        return {
            startDateLabel: moment(rangeStartDate).format('MMM DD, YYYY'),
            chartData: this.getChartData(members, moment(rangeStartDate), moment(rangeEndDate), isNightShiftEnabled),
            totalSubs: totalSubs,
            totalSubsToday: totalSubsToday,
            totalSubsInRange: totalSubsLastMonth
        };
    }),

    init() {
        this._super(...arguments);
        this.setChartJSDefaults();
    },

    actions: {
        changeDateRange(range) {
            this.set('range', get(range, 'days'));
        }
    },

    setChartJSDefaults() {
        let isNightShiftEnabled = this.feature.nightShift;
        Chart.defaults.LineWithLine = Chart.defaults.line;
        Chart.controllers.LineWithLine = Chart.controllers.line.extend({
            draw: function (ease) {
                Chart.controllers.line.prototype.draw.call(this, ease);

                if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
                    var activePoint = this.chart.tooltip._active[0],
                        ctx = this.chart.ctx,
                        x = activePoint.tooltipPosition().x,
                        topY = this.chart.scales['y-axis-0'].top,
                        bottomY = this.chart.scales['y-axis-0'].bottom;

                    // draw line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = (isNightShiftEnabled ? 'rgba(62, 176, 239, 0.65)' : 'rgba(62, 176, 239, 0.8)');
                    ctx.stroke();
                    ctx.restore();
                }
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

    getChartData(members, startDate, endDate, isNightShiftEnabled) {
        this.setChartJSDefaults();
        let dateFormat = 'MMM DD, YYYY';
        let monthData = [];
        let dateLabel = [];
        let rangeInDays = endDate.diff(startDate, 'days');
        for (var m = moment(startDate); m.isSameOrBefore(endDate, 'day'); m.add(1, 'days')) {
            dateLabel.push(m.format(dateFormat));
            let membersTillDate = members.filter((member) => {
                let isValid = moment(member.createdAtUTC).isSameOrBefore(m, 'day');
                return isValid;
            }).length;
            monthData.push(membersTillDate);
        }
        let maxTicksAllowed = this.getTicksForRange(rangeInDays);
        return {
            data: {
                labels: dateLabel,
                datasets: [{
                    label: 'Total members',
                    cubicInterpolationMode: 'monotone',
                    data: monthData,
                    fill: false,
                    backgroundColor: 'rgba(62,176,239,.9)',
                    pointRadius: 0,
                    pointHitRadius: 10,
                    borderColor: 'rgba(62,176,239,.9)',
                    borderJoinStyle: 'round'
                }]
            },
            options: {
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
                    titleMarginBottom: 4
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
                            color: (isNightShiftEnabled ? '#333F44' : '#E5EFF5'),
                            zeroLineColor: (isNightShiftEnabled ? '#333F44' : '#E5EFF5')
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
                            display: false,
                            beginAtZero: true
                        }
                    }]
                }
            }
        };
    }
});
