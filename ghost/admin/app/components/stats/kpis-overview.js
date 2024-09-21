import Component from '@glimmer/component';
import fetch from 'fetch';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject} from 'ghost-admin/decorators/inject';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class KpisOverview extends Component {
    @inject config;
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
        this.fetchData.perform(this.args.chartRange, this.args.audience);
    }

    @task
    *fetchData(chartRange, audience) {
        try {
            const endDate = moment().endOf('day');
            const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');

            const params = new URLSearchParams({
                site_uuid: this.config.stats.id,
                date_from: startDate.format('YYYY-MM-DD'),
                date_to: endDate.format('YYYY-MM-DD')
            });

            if (audience.length > 0) {
                params.append('member_status', audience.join(','));
            }

            const response = yield fetch(`${this.config.stats.endpoint}/v0/pipes/kpis.json?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.stats.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const rawData = yield response.json();

            this.totals = this.processData(rawData.data);
        } catch (error) {
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

        return {
            avg_session_sec: Math.floor(_ponderatedKPIsTotal('avg_session_sec') / 60),
            pageviews: formatNumber(_KPITotal('pageviews')),
            visits: formatNumber(totalVisits),
            bounce_rate: _ponderatedKPIsTotal('bounce_rate').toFixed(2)
        };
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
