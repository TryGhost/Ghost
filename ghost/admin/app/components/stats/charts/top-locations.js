'use client';

import AllStatsModal from '../../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {BarList, useQuery} from '@tinybirdco/charts';
import {action} from '@ember/object';
import {barListColor} from '../../../utils/stats';
import {formatNumber} from '../../../helpers/format-number';
import {getCountryFlag} from 'ghost-admin/utils/stats';
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

    @action
    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params};

        this.router.replaceWith(currentRoute.name, {queryParams: newQueryParams});
    }

    ReactComponent = (props) => {
        let {chartRange, audience, device, browser, location, source, pathname} = props;

        const endDate = moment().endOf('day');
        const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');

        /**
         * @typedef {Object} Params
         * @property {string} site_uuid
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
            member_status: audience.length === 0 ? null : audience.join(','),
            device,
            browser,
            location,
            referrer: source === 'direct' ? null : source,
            pathname,
            limit: 7
        };

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
                categories={['hits']}
                categoryConfig={{
                    hits: {
                        label: <span className="gh-stats-data-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-data-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[barListColor]}
            />
        );
    };
}
