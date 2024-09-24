'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CONTENT_OPTIONS, barListColor, getStatsParams} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TopPages extends Component {
    @inject config;

    @tracked contentOption = CONTENT_OPTIONS[0];
    @tracked contentOptions = CONTENT_OPTIONS;

    @service modals;

    @action
    openSeeAll(chartRange, audience) {
        this.modals.open(AllStatsModal, {
            type: 'top-pages',
            chartRange,
            audience
        });
    }

    @action
    onContentOptionChange(selected) {
        this.contentOption = selected;
    }

    ReactComponent = (props) => {
        const {chartRange, audience} = props;

        const params = getStatsParams(
            this.config,
            chartRange,
            audience,
            {limit: 7}
        );

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_pages.json`,
            token: this.config.stats.token,
            params
        });

        return (
            <BarList
                data={data}
                meta={meta}
                error={error}
                loading={loading}
                index="pathname"
                indexConfig={{
                    label: <span className="gh-stats-detail-header">Post or page</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-detail-label">{label}</span>
                    )
                }}
                categories={['hits']}
                categoryConfig={{
                    hits: {
                        label: <span className="gh-stats-detail-header">Visits</span>,
                        renderValue: ({value}) => <span className="gh-stats-detail-value">{formatNumber(value)}</span>
                    }
                }}
                colorPalette={[barListColor]}
            />
        );
    };
}
