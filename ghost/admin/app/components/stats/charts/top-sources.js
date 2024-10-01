'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CAMPAIGN_OPTIONS, barListColor, getStatsParams} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const LIMIT = 7;
const DEFAULT_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

export default class TopSources extends Component {
    @inject config;
    @service modals;
    @service router;

    @tracked campaignOption = CAMPAIGN_OPTIONS[0];
    @tracked campaignOptions = CAMPAIGN_OPTIONS;
    @tracked showSeeAll = true;

    @action
    onCampaignOptionChange(selected) {
        this.campaignOption = selected;
    }

    @action
    openSeeAll() {
        this.modals.open(AllStatsModal, {
            type: 'top-sources',
            chartRange: this.args.chartRange,
            audience: this.args.audience
        });
    }

    @action
    navigateToFilter(source) {
        this.updateQueryParams({source});
    }

    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params};

        this.router.transitionTo({queryParams: newQueryParams});
    }

    updateSeeAllVisibility(data) {
        this.showSeeAll = data && data.length > LIMIT;
    }

    ReactComponent = (props) => {
        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_sources.json`,
            token: this.config.stats.token,
            params: getStatsParams(
                this.config,
                props,
                {limit: 7}
            )
        });

        this.updateSeeAllVisibility(data);

        return (
            <BarList
                data={data ? data.slice(0, LIMIT) : []}
                meta={meta}
                error={error}
                loading={loading}
                index="source"
                indexConfig={{
                    label: <span className="gh-stats-data-header">Source</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-data-label">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label || 'direct');
                                }}
                                className="gh-stats-domain"
                            >
                                <img
                                    src={`https://www.faviconextractor.com/favicon/${label || 'direct'}?larger=true`}
                                    className="gh-stats-favicon"
                                    onError={(e) => {
                                        e.target.src = DEFAULT_ICON_URL;
                                    }} />
                                <span title={label || 'Direct'}>{label || 'Direct'}</span>
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
