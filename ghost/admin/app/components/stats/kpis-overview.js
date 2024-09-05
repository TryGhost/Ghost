import Component from '@glimmer/component';
import fetch from 'fetch';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class KpisOverview extends Component {
    @inject config;
    @tracked selected = 'unique_visitors';
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
        this.fetchData.perform();
    }

    setupFocusListener() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchData.perform();
            }
        });
    }

    @task
    *fetchData() {
        try {
            const response = yield fetch(`${this.config.stats.endpoint}/v0/pipes/kpis.json?site_uuid=${this.config.stats.id}`, {
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
            pageviews: _KPITotal('pageviews'),
            visits: totalVisits,
            bounce_rate: _ponderatedKPIsTotal('bounce_rate').toFixed(2)
        };
    }

    willDestroy() {
        super.willDestroy();
        // Remove the event listener when the component is destroyed
        document.removeEventListener('visibilitychange', this.fetchData.perform);
    }

    @action
    changeTabToUniqueVisitors() {
        this.selected = 'unique_visitors';
    }

    @action
    changeTabToVisits() {
        this.selected = 'visits';
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

    get uniqueVisitorsTabSelected() {
        return (this.selected === 'unique_visitors');
    }

    get visitsTabSelected() {
        return (this.selected === 'visits');
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
