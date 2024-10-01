'use client';

import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {AreaChart, useQuery} from '@tinybirdco/charts';
import {formatNumber} from '../../../helpers/format-number';
import {getDateRange, getStatsParams, statsStaticColors} from '../../../utils/stats';
import {hexToRgba} from 'ghost-admin/utils/stats';
import {inject} from 'ghost-admin/decorators/inject';

export default class KpisComponent extends Component {
    @inject config;

    ReactComponent = (props) => {
        const {chartRange, selected} = props;

        const params = getStatsParams(
            this.config,
            props
        );

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/kpis.json`,
            token: this.config.stats.token,
            params
        });

        const LINE_COLOR = statsStaticColors[0];
        const INDEX = 'date';
        const CATEGORY = selected === 'unique_visits' ? 'visits' : selected;

        const dateLabels = [
            params.date_from,
            params.date_to
        ];

        const {endDate, startDate} = getDateRange(chartRange);

        return (
            <AreaChart
                data={data}
                meta={meta}
                loading={loading}
                error={error}
                index={INDEX}
                categories={[CATEGORY]}
                colorPalette={[LINE_COLOR]}
                backgroundColor="transparent"
                fontSize="13px"
                textColor="#AEB7C1"
                height="300px"
                params={params}
                options={{
                    grid: {
                        left: '10px',
                        right: '20px',
                        top: '10%',
                        bottom: 0,
                        containLabel: true
                    },
                    xAxis: {
                        type: 'time',
                        min: startDate.toISOString(),
                        max: endDate.subtract(1, 'day').toISOString(),
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
                        type: 'value',
                        splitLine: {
                            show: false,
                            lineStyle: {
                                type: 'dashed',
                                color: '#DDE1E5' // Adjust color as needed
                            }
                        },
                        axisLabel: {
                            show: true
                        },
                        axisTick: {
                            show: false
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
                        extraCssText: 'box-shadow: 0 0 0 1px rgba(0,0,0,0.03), 0px 100px 80px 0px rgba(0, 0, 0, 0.07), 0px 41.778px 33.422px 0px rgba(0, 0, 0, 0.05), 0px 22.336px 17.869px 0px rgba(0, 0, 0, 0.04), 0px 12.522px 10.017px 0px rgba(0, 0, 0, 0.04), 0px 6.65px 5.32px 0px rgba(0, 0, 0, 0.03), 0px 2.767px 2.214px 0px rgba(0, 0, 0, 0.02); padding: 6px 8px;',
                        formatter: function (fparams) {
                            let displayValue;
                            let tooltipTitle;
                            switch (CATEGORY) {
                            case 'avg_session_sec':
                                tooltipTitle = 'Visit duration';
                                displayValue = fparams[0].value[1] !== null && (fparams[0].value[1] / 60).toFixed(0) + ' min';
                                break;
                            case 'bounce_rate':
                                tooltipTitle = 'Bounce rate';
                                displayValue = fparams[0].value[1] !== null && fparams[0].value[1].toFixed(2) + '%';
                                break;
                            default:
                                tooltipTitle = 'Unique visits';
                                displayValue = fparams[0].value[1] !== null && formatNumber(fparams[0].value[1]);
                                break;
                            }
                            if (!displayValue) {
                                displayValue = 'N/A';
                            }
                            return `<div><div class="gh-stats-tooltip-header">${moment(fparams[0].value[0]).format('D MMM YYYY')}</div><div class="gh-stats-tooltip-data"><span class="gh-stats-tooltip-marker" style="background: ${LINE_COLOR}"></span><span class="gh-stats-tooltip-label">${tooltipTitle}</span> <span class="gh-stats-tooltip-value">${displayValue}</span></div></div>`;
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
                                color: {
                                    type: 'linear',
                                    x: 0,
                                    y: 0,
                                    x2: 0,
                                    y2: 1,
                                    colorStops: [{
                                        offset: 0, color: hexToRgba(LINE_COLOR, 0.15)
                                    }, {
                                        offset: 1, color: hexToRgba(LINE_COLOR, 0.0)
                                    }],
                                    global: false
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
                            smoothMonotone: 'x',
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
