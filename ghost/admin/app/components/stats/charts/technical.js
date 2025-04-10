'use client';

import Component from '@glimmer/component';
import React from 'react';
import {DonutChart, useQuery} from '@tinybirdco/charts';
import {STATS_LABEL_MAPPINGS, getEndpointUrl, getStatsParams, getToken, statsStaticColors} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {capitalizeFirstLetter} from '../../../helpers/capitalize-first-letter';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class TechnicalComponent extends Component {
    @service router;
    @service settings;
    @inject config;

    @action
    navigateToFilter(type, value) {
        this.updateQueryParams({[type]: value});
    }

    @action
    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params, timezone: this.settings.timezone};
        this.router.transitionTo({queryParams: newQueryParams});
    }

    ReactComponent = (props) => {
        const {selected} = props;

        // If OS is selected but not available, switch to devices
        let effectiveSelected = selected;

        const colorPalette = statsStaticColors.slice(0, 5);

        const params = getStatsParams(
            this.config,
            props,
            {limit: 5}
        );

        let endpoint;
        let indexBy;
        let tableHead;

        switch (effectiveSelected) {
        case 'browsers':
            endpoint = getEndpointUrl(this.config, 'api_top_browsers');
            indexBy = 'browser';
            tableHead = 'Browser';
            break;
        case 'os':
            endpoint = getEndpointUrl(this.config, 'api_top_os');
            indexBy = 'os';
            tableHead = 'OS';
            break;
        default:
            endpoint = getEndpointUrl(this.config, 'api_top_devices');
            indexBy = 'device';
            tableHead = 'Device';
        }

        const {data, meta, error, loading} = useQuery({
            endpoint: endpoint,
            token: getToken(this.config),
            params
        });

        const transformedData = (data ?? []).map((item, index) => ({
            name: item[indexBy],
            value: item.visits,
            color: colorPalette[index]
        }));

        return (
            <div className="gh-stats-piechart-container">
                <div className="gh-stats-piechart">
                    <DonutChart
                        data={data}
                        meta={meta}
                        loading={loading}
                        error={error}
                        index={indexBy}
                        categories={['visits']}
                        colorPalette={colorPalette}
                        backgroundColor="transparent"
                        fontSize="13px"
                        textColor="#AEB7C1"
                        showLegend={true}
                        params={params}
                        height="230px"
                        options={{
                            color: colorPalette,
                            tooltip: {
                                show: true,
                                trigger: 'item',
                                backgroundColor: '#fff',
                                textStyle: {
                                    color: '#15171A'
                                },
                                extraCssText: 'border: none !important; box-shadow: 0px 100px 80px 0px rgba(0, 0, 0, 0.07), 0px 41.778px 33.422px 0px rgba(0, 0, 0, 0.05), 0px 22.336px 17.869px 0px rgba(0, 0, 0, 0.04), 0px 12.522px 10.017px 0px rgba(0, 0, 0, 0.04), 0px 6.65px 5.32px 0px rgba(0, 0, 0, 0.03), 0px 2.767px 2.214px 0px rgba(0, 0, 0, 0.02); padding: 6px 10px;',
                                formatter: function (fparams) {
                                    return `<span style="background-color: ${fparams.color}; display: inline-block; width: 10px; height: 10px; margin-right: 5px; border-radius: 2px;"></span> <span class="gh-stats-tooltip-label">${fparams.name}</span> <span class="gh-stats-tooltip-value">${formatNumber(fparams.value)}</span>`;
                                }
                            },
                            legend: {
                                show: false,
                                orient: 'vertical',
                                left: 'left',
                                textStyle: {
                                    color: '#AEB7C1'
                                }
                            },
                            series: [
                                {
                                    animation: true,
                                    name: tableHead,
                                    padAngle: 1.5,
                                    type: 'pie',
                                    radius: ['67%', '90%'],
                                    center: ['50%', '50%'], // Adjusted to align the chart to the top
                                    data: transformedData,
                                    label: {
                                        show: false,
                                        formatter: '{b}: {c}'
                                    },
                                    labelLine: {
                                        lineStyle: {
                                            color: '#DDE1E5'
                                        },
                                        smooth: 0.2,
                                        length: 10,
                                        length2: 20
                                    },
                                    padding: 0
                                }
                            ]
                        }}
                    />
                </div>
                <table>
                    <thead>
                        <tr>
                            <th><span className="gh-stats-data-header">{tableHead}</span></th>
                            <th><span className="gh-stats-data-header">Visits</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transformedData.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            this.navigateToFilter(indexBy, item.name);
                                        }}
                                        className="gh-stats-data-label"
                                    >
                                        <span style={{backgroundColor: item.color, display: 'inline-block', width: '10px', height: '10px', marginRight: '5px', borderRadius: '2px'}}></span>
                                        {STATS_LABEL_MAPPINGS[item.name] || capitalizeFirstLetter(item.name)}
                                    </a>
                                </td>
                                <td><span className="gh-stats-data-value">{formatNumber(item.value)}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
}
