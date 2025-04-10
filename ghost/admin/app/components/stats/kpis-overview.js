import Component from '@glimmer/component';
import fetch from 'fetch';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {formatVisitDuration} from '../../utils/stats';
import {getEndpointUrl, getStatsParams, getToken} from 'ghost-admin/utils/stats';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class KpisOverview extends Component {
    @inject config;
    @service settings;
    @tracked selected = 'unique_visits';
    @tracked totals = null;
    @tracked showGranularity = true;

    get granularityOptions() {
        const chartRange = this.args.chartRange;
        if (chartRange >= 8 && chartRange <= 30) {
            return [
                {name: 'Days', value: 'days'},
                {name: 'Weeks', value: 'weeks'}
            ];
        } else if (chartRange > 30 && chartRange <= 365) {
            return [
                {name: 'Days', value: 'days'},
                {name: 'Weeks', value: 'weeks'},
                {name: 'Months', value: 'months'}
            ];
        } else {
            return [
                {name: 'Weeks', value: 'weeks'},
                {name: 'Months', value: 'months'}
            ];
        }
    }

    @tracked granularity = this.granularityOptions[0];

    @action
    onGranularityChange(selected) {
        this.granularity = selected;
    }

    constructor() {
        super(...arguments);
        this.fetchDataIfNeeded();
    }

    @action
    fetchDataIfNeeded() {
        this.fetchData.perform(this.args);
    }

    @task
    *fetchData(args) {
        try {
            const params = new URLSearchParams(getStatsParams(
                this.config,
                args
            ));

            const endpoint = getEndpointUrl(this.config, 'api_kpis', params);
            const token = getToken(this.config);
            const response = yield fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const rawData = yield response.json();

            this.totals = this.processData(rawData.data);
        } catch (error) {
            this.totals = null; // reset totals if the endpoint doesn't exist/fails
            // console.error('Error fetching KPI data:', error);
            // Handle error (e.g., set an error state, show a notification)
        }
    }

    processData(data) {
        const queryData = data;

        // Sum total KPI value from the trend
        const _KPITotal = kpi => queryData.reduce((prev, curr) => (curr[kpi] ?? 0) + prev, 0);

        // Get total number of sessions
        const totalVisits = _KPITotal('visits');

        // Sum total KPI value from the trend, ponderating using sessions
        const _ponderatedKPIsTotal = kpi => queryData.reduce((prev, curr) => prev + ((curr[kpi] ?? 0) * curr.visits / totalVisits), 0);

        const formattedVisitDurations = formatVisitDuration(_ponderatedKPIsTotal('avg_session_sec'));
        const formattedBouceRate = (_ponderatedKPIsTotal('bounce_rate') * 100).toFixed(0);

        const totals = {
            avg_session_sec: isNaN(_ponderatedKPIsTotal('avg_session_sec')) ? '0m' : formattedVisitDurations,
            pageviews: formatNumber(_KPITotal('pageviews')) || '0',
            visits: formatNumber(totalVisits) || '0',
            bounce_rate: isNaN(formattedBouceRate) ? '0' : formattedBouceRate
        };

        this.totals = totals;
        this.args.onTotalsChange?.(totals);

        return totals;
    }

    get hasNoViews() {
        const hasNoViews = this.totals?.visits === '0' || this.totals?.pageviews === '0';
        return hasNoViews;
    }

    willDestroy() {
        super.willDestroy();
        // Remove the event listener when the component is destroyed
        document.removeEventListener('visibilitychange', this.fetchData.perform);
    }

    @action
    changeTabToUniqueVisits() {
        this.selected = 'unique_visits';
    }

    @action
    changeTabToPageviews() {
        this.selected = 'pageviews';
    }

    @action
    changeTabToAvgVisitTime() {
        this.selected = 'avg_session_sec';
    }

    @action
    changeTabToBounceRate() {
        this.selected = 'bounce_rate';
    }

    get uniqueVisitsTabSelected() {
        return (this.selected === 'unique_visits');
    }

    get pageviewsTabSelected() {
        return (this.selected === 'pageviews');
    }

    get avgVisitTimeTabSelected() {
        return (this.selected === 'avg_session_sec');
    }

    get bounceRateTabSelected() {
        return (this.selected === 'bounce_rate');
    }
}
