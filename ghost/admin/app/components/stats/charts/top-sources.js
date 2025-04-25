'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CAMPAIGN_OPTIONS, barListColor, getEndpointUrl, getStatsParams, getToken} from 'ghost-admin/utils/stats';
import {STATS_LABEL_MAPPINGS} from '../../../utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const LIMIT = 6;
const DEFAULT_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

export default class TopSources extends Component {
    @inject config;
    @service modals;
    @service router;
    @service settings;

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
        const newQueryParams = {...currentRoute.queryParams, ...params, timezone: this.settings.timezone};

        this.router.transitionTo({queryParams: newQueryParams});
    }

    updateSeeAllVisibility(data) {
        this.showSeeAll = data && data.length > LIMIT;
    }

    ReactComponent = (props) => {
        const {data, meta, error, loading} = useQuery({
            endpoint: getEndpointUrl(this.config, 'api_top_sources'),
            token: getToken(this.config),
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
                                style={{cursor: 'default'}}
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label || 'direct');
                                }}
                                className="gh-stats-bar-text"
                            >
                                <img
                                    src={`https://www.faviconextractor.com/favicon/${label || 'direct'}?larger=true`}
                                    className="gh-stats-favicon"
                                    onError={(e) => {
                                        e.target.src = DEFAULT_ICON_URL;
                                    }} />
                                <span title={label || 'Direct'}>{STATS_LABEL_MAPPINGS[label] || label || 'Direct'}</span>
                            </a>
                            {label && <a href={`https://${label}`} target="_blank" className="gh-stats-external-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>}
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
