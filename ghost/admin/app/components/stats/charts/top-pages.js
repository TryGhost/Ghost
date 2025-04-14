'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import {BarList, useQuery} from '@tinybirdco/charts';
import {CONTENT_OPTIONS, barListColor, getEndpointUrl, getStatsParams, getToken} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const LIMIT = 6;

export default class TopPages extends Component {
    @inject config;
    @service modals;
    @service router;
    @service settings;

    @tracked contentOption = CONTENT_OPTIONS[0];
    @tracked contentOptions = CONTENT_OPTIONS;
    @tracked showSeeAll = true;

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

    @action
    navigateToFilter(pathname) {
        this.updateQueryParams({pathname});
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
        const params = getStatsParams(
            this.config,
            props,
            {limit: LIMIT + 1}
        );

        const {data, meta, error, loading} = useQuery({
            endpoint: getEndpointUrl(this.config, 'api_top_pages'),
            token: getToken(this.config),
            params
        });

        this.updateSeeAllVisibility(data);

        return (
            <BarList
                data={data ? data.slice(0, LIMIT) : []}
                meta={meta}
                error={error}
                loading={loading}
                index="pathname"
                indexConfig={{
                    label: <span className="gh-stats-data-header">Post or page</span>,
                    renderBarContent: ({label}) => (
                        <span className="gh-stats-data-label">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label);
                                }}
                                className="gh-stats-bar-text"
                            >
                                <span title={label}>{label}</span>
                            </a>
                            {label && <a href={label} target="_blank" className="gh-stats-external-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>}
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
