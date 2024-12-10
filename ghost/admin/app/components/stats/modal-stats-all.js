'use client';

import Component from '@glimmer/component';
import React from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {BarList, useQuery} from '@tinybirdco/charts';
import {TB_VERSION, barListColor, getCountryFlag, getStatsParams} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

countries.registerLocale(enLocale);

export default class AllStatsModal extends Component {
    @inject config;
    @service router;
    @service modals;

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

    @action
    navigateToFilter(label) {
        const params = {};
        if (this.type === 'top-sources') {
            params.source = label || 'direct';
        } else if (this.type === 'top-locations') {
            params.location = label || 'unknown';
        } else if (this.type === 'top-pages') {
            params.pathname = label;
        }

        this.args.close();
        this.updateQueryParams(params);
    }

    updateQueryParams(params) {
        const currentRoute = this.router.currentRoute;
        const newQueryParams = {...currentRoute.queryParams, ...params};

        this.router.transitionTo({queryParams: newQueryParams});
    }

    getCountryName = (label) => {
        return countries.getName(label, 'en') || 'Unknown';
    };

    ReactComponent = (props) => {
        const {type} = props;

        const params = getStatsParams(
            this.config,
            props
        );

        let endpoint;
        let labelText;
        let indexBy;
        let unknownOption = 'Unknown';
        switch (type) {
        case 'top-sources':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_sources__v${TB_VERSION}.json`;
            labelText = 'Source';
            indexBy = 'source';
            unknownOption = 'Direct';
            break;
        case 'top-locations':
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_locations__v${TB_VERSION}.json`;
            labelText = 'Country';
            indexBy = 'location';
            unknownOption = 'Unknown';
            break;
        default:
            endpoint = `${this.config.stats.endpoint}/v0/pipes/top_pages__v${TB_VERSION}.json`;
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
                    label: <span className="gh-stats-data-header">{labelText}</span>,
                    renderBarContent: ({label}) => (
                        <span className={`gh-stats-data-label ${type === 'top-sources' && 'gh-stats-domain'}`}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.navigateToFilter(label);
                                }}
                                className="gh-stats-domain"
                            >
                                {(type === 'top-locations') && getCountryFlag(label)}
                                {(type === 'top-sources') && (
                                    <img
                                        src={`https://www.google.com/s2/favicons?domain=${label || 'direct'}&sz=32`}
                                        className="gh-stats-favicon"
                                    />
                                )}
                                {type === 'top-sources' && <span title={label || unknownOption}>{label || unknownOption}</span>}
                                {type === 'top-locations' && <span title={this.getCountryName(label) || unknownOption}>{this.getCountryName(label) || unknownOption}</span>}
                                {type === 'top-pages' && <span title={label}>{label}</span>}
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
