'use client';

import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {AreaChart, useQuery} from '@tinybirdco/charts';
import {inject} from 'ghost-admin/decorators/inject';

export default class KpisComponent extends Component {
    @inject config;

    ReactComponent = (props) => {
        let chartRange = props.chartRange;
        let audience = props.audience;

        // @TODO: ATM there's a two day worth gap (padding) on the right side
        // of the chart. endDate needs to be adjusted to get rid of it
        const endDate = moment().endOf('day');
        const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');

        /**
         * @typedef {Object} Params
         * @property {string} cid
         * @property {string} [date_from]
         * @property {string} [date_to]
         * @property {string} [member_status]
         * @property {number} [limit]
         * @property {number} [skip]
         */

        const params = {
            site_uuid: this.config.stats.id,
            date_from: startDate.format('YYYY-MM-DD'),
            date_to: endDate.format('YYYY-MM-DD'),
            member_status: audience.length === 0 ? null : audience.join(',')
        };

        const LINE_COLOR = '#8E42FF';
        const INDEX = 'date';
        const CATEGORY = props.selected === 'unique_visitors' ? 'visits' : props.selected;

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/kpis.json`,
            token: this.config.stats.token,
            params
        });

        // Create an array with every second date value
        const dateLabels = [];
        let currentDate = startDate.clone();
        let skipDays;
        switch (chartRange) {
        case 1:
            skipDays = 0; // Show all hours for 1 day
            break;
        case 7:
            skipDays = 0; // Skip every other day for 7 days
            break;
        case (30 + 1):
            skipDays = 2; // Skip every 3rd day for 30 and 90 days
            break;
        case (90 + 1):
            skipDays = 5; // Skip every 3rd day for 30 and 90 days
            break;
        case (365 + 1):
        case (12 * (30 + 1)):
            skipDays = 30; // Skip every 7th day for 1 year
            break;
        case 1000:
            skipDays = 29; // Skip every 30th day for all time
            break;
        default:
            skipDays = 1; // Default to skipping every other day
        }

        let dayCounter = 0;
        while (currentDate.isSameOrBefore(endDate)) {
            if (dayCounter % (skipDays + 1) === 0) {
                dateLabels.push(currentDate.format('YYYY-MM-DD'));
            }
            currentDate.add(1, 'days');
            dayCounter = dayCounter + 1;
        }

        return (
            <AreaChart
                data={data}
                meta={meta}
                loading={loading}
                error={error}
                index={INDEX}
                categories={[CATEGORY]}
                colorPalette={[LINE_COLOR, '#008060', '#0EB1B9', '#9263AF', '#5A6FC0']}
                backgroundColor="transparent"
                fontSize="13px"
                textColor="#AEB7C1"
                height="300px"
                params={params}
                options={{
                    grid: {
                        left: '10px',
                        right: '10px',
                        top: '10%',
                        bottom: 0,
                        containLabel: true
                    },
                    xAxis: {
                        type: 'time',
                        min: startDate.toISOString(),
                        max: endDate.toISOString(),
                        boundaryGap: ['0%', '0%'],
                        axisLabel: {
                            formatter: chartRange <= 7 ? '{ee}' : '{d} {MMM}',
                            customValues: dateLabels
                        },
                        axisTick: {
                            show: false,
                            alignWithLabel: true,
                            interval: 0
                        },
                        axisPointer: {
                            snap: true
                        },
                        splitNumber: dateLabels.length,
                        splitLine: {
                            show: false
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#DDE1E5'
                            }
                        }
                    },
                    yAxis: {
                        splitLine: {
                            show: true,
                            lineStyle: {
                                type: 'dashed',
                                color: '#DDE1E5' // Adjust color as needed
                            }
                        }
                    },
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: '#fff',
                        textStyle: {
                            color: '#15171A'
                        },
                        axisPointer: {
                            type: 'line',
                            z: 1
                        },
                        extraCssText: 'box-shadow: 0px 100px 80px 0px rgba(0, 0, 0, 0.07), 0px 41.778px 33.422px 0px rgba(0, 0, 0, 0.05), 0px 22.336px 17.869px 0px rgba(0, 0, 0, 0.04), 0px 12.522px 10.017px 0px rgba(0, 0, 0, 0.04), 0px 6.65px 5.32px 0px rgba(0, 0, 0, 0.03), 0px 2.767px 2.214px 0px rgba(0, 0, 0, 0.02);',
                        formatter: function (fparams) {
                            return `<div><div>${moment(fparams[0].value[0]).format('DD MMM, YYYY')}</div><div><span style="display: inline-block; margin-right: 16px; font-weight: 600;">Pageviews</span> ${fparams[0].value[1]}</div></div>`;
                        }
                    },
                    series: [
                        {
                            itemStyle: {
                                color: LINE_COLOR
                            },
                            type: 'line',
                            areaStyle: {
                                opacity: 0.6,
                                // color: 'rgba(198, 220, 255, 1)'
                                color: {
                                    type: 'linear',
                                    x: 0,
                                    y: 0,
                                    x2: 0,
                                    y2: 1,
                                    colorStops: [{
                                        offset: 0, color: 'rgba(142, 66, 255, 0.3)' // color at 0%
                                    }, {
                                        offset: 1, color: 'rgba(142, 66, 255, 0.0)' // color at 100%
                                    }],
                                    global: false // default is false
                                }
                            },
                            lineStyle: {
                                width: 2,
                                cap: 'square'
                            },
                            emphasis: {
                                itemStyle: {
                                    opacity: 1,
                                    borderWidth: 3
                                }
                            },
                            showSymbol: false,
                            symbol: 'circle',
                            symbolSize: 10,
                            z: 8,
                            smooth: false,
                            name: CATEGORY,
                            data: (data ?? []).map(row => [
                                String(row[INDEX]),
                                row[CATEGORY]
                            ])
                        }
                    ]
                }}
            />
        );
    };
}
