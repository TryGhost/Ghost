'use client';

import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {BarList, useQuery} from '@tinybirdco/charts';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {getCountryFlag} from 'ghost-admin/utils/stats';
import {inject} from 'ghost-admin/decorators/inject';
import {statsStaticColors} from 'ghost-admin/utils/stats';

export default class AllStatsModal extends Component {
    @inject config;

    get type() {
        return this.args.data.type;
    }

    get chartRange() {
        return this.args.data.chartRange;
    }

    get audience() {
        return this.args.data.audience;
    }

    get modalTitle() {
        switch (this.type) {
        case 'top-sources':
            return 'Sources';
        case 'top-locations':
            return 'Locations';
        default:
            return 'Content';
        }
    }

    ReactComponent = (props) => {
        let chartRange = props.chartRange;
        let audience = props.audience || [];
        let type = props.type;

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

        let endpoint;
        let labelText;
        let indexBy;
        let unknownOption = 'Unknown';
        switch (type) {
        case 'top-sources':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_sources.json`;
            labelText = 'Source';
            indexBy = 'referrer';
            unknownOption = 'Direct';
            break;
        case 'top-locations':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_locations.json`;
            labelText = 'Country';
            indexBy = 'location';
            unknownOption = 'Unknown';
            break;
        default:
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_pages.json`;
            labelText = 'Post or page';
            indexBy = 'pathname';
            break;
        }

        const {data, meta, error, loading} = useQuery({
            endpoint: endpoint,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index={indexBy}
                indexConfig={{
                    label: <span className="gh-stats-detail-header">{labelText}</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-detail-label">{(type === 'top-locations') && getCountryFlag(label)} {label || unknownOption}</span>
                    )
                }}
                categories={['hits']}
                categoryConfig={{
                    hits: {
                        label: <span className="gh-stats-detail-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-detail-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[statsStaticColors[4]]}
            />
        );
    };
}
