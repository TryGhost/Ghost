'use client';

import AllStatsModal from '../modal-stats-all';
import Component from '@glimmer/component';
import React from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {BarList, useQuery} from '@tinybirdco/charts';
import {STATS_LABEL_MAPPINGS} from '../../../utils/stats';
import {TB_VERSION, barListColor, getCountryFlag, getStatsParams} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const LIMIT = 6;

countries.registerLocale(enLocale);

export default class TopLocations extends Component {
    @inject config;
    @service modals;
    @service router;
    @service settings;

    @tracked showSeeAll = true;

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
        const newQueryParams = {...currentRoute.queryParams, ...params, timezone: this.settings.timezone};

        this.router.transitionTo({queryParams: newQueryParams});
    }

    updateSeeAllVisibility(data) {
        this.showSeeAll = data && data.length > LIMIT;
    }

    getCountryName = (label) => {
        return STATS_LABEL_MAPPINGS[label] || countries.getName(label, 'en') || 'Unknown';
    };

    ReactComponent = (props) => {
        const params = getStatsParams(
            this.config,
            props,
            {limit: 7}
        );

        const {data, meta, error, loading} = useQuery({
            endpoint: `${this.config.stats.endpoint}/v0/pipes/api_top_locations__v${TB_VERSION}.json`,
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
                                className="gh-stats-bar-text"
                            >
                                <span title={this.getCountryName(label) || 'Unknown'}>{getCountryFlag(label)} {this.getCountryName(label) || 'Unknown' || 'Unknown'}</span>
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
