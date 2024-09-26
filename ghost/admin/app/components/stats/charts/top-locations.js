'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {action} from '@ember/object';
import {barListColor, getCountryFlag, getStatsParams} from 'ghost-admin/utils/stats';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class TopLocations extends Component {
    @inject config;
    @service modals;
    @service router;

    @action
    openSeeAll() {
        this.modals.open(AllStatsModal, {
            type: 'top-locations',
            chartRange: this.args.chartRange,
            audience: this.args.audience
        });
    }

    @action
    navigateToFilter(location) {
        this.updateQueryParams({location});
    }

    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params};

        this.router.transitionTo({queryParams: newQueryParams});
    }

    ReactComponent = (props) => {
        const params = getStatsParams(
            this.config,
            props,
            {limit: 7}
        );

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_locations.json`,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index="location"
                indexConfig={{
                    label: <span className="gh-stats-data-header">Country</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-data-label">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label || 'Unknown');
                                }}
                                className="gh-stats-domain"
                            >
                                {getCountryFlag(label)} {label || 'Unknown'}
                            </a>
                        </span>
                    )
                }}
                categories={['visits']}
                categoryConfig={{
                    visits: {
                        label: <span className="gh-stats-data-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-data-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[barListColor]}
            />
        );
    };
}
