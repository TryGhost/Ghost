'use client';

import Component from '@glimmer/component';
import React from 'react';
import moment from 'moment-timezone';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CAMPAIGN_OPTIONS} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {statsStaticColors} from 'ghost-admin/utils/stats';
import {tracked} from '@glimmer/tracking';

export default class TopPages extends Component {
    @inject config;

    @tracked campaignOption = CAMPAIGN_OPTIONS[0];
    @tracked campaignOptions = CAMPAIGN_OPTIONS;

    @action
    onCampaignOptionChange(selected) {
        this.campaignOption = selected;
    }

    ReactComponent = (props) => {
        let chartRange = props.chartRange;
        let audience = props.audience;

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

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_sources.json`,
            token: this.config.stats.token,
            params,
            limit: 6
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index="referrer"
                categories={['hits']}
                colorPalette={[statsStaticColors[4]]}
                height="300px"
            />
        );
    };
}
