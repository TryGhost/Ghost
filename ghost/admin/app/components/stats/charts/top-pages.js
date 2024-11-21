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

const LIMIT = 6;

export default class TopPages extends Component {
    @inject config;
    @service modals;
    @service router;

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
        const newQueryParams = {...currentRoute.queryParams, ...params};

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
            endpoint: `${this.config.stats.endpoint}/v0/pipes/top_pages.json`,
            token: this.config.stats.token,
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
                                className="gh-stats-domain"
                            >
                                <span title={label}>{label}</span>
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
