import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardController extends Controller {
    @service feature;
    @service session;
    @service membersStats;

    @tracked
    events = {
        data: null,
        error: null,
        loading: false
    };
    @tracked
    mrrStats = {
        data: null,
        error: null,
        loading: false
    };

    constructor(...args) {
        super(...args);
        this.loadEvents();
        this.loadCharts();
    }

    loadCharts() {
        this.membersStats.fetchMRR().then((stats) => {
            this.mrrStats.data = stats;
            this.events.loading = false;
        }, (error) => {
            this.mrrStats.error = error;
            this.events.loading = false;
        });
    }

    loadEvents() {
        this.events.loading = true;
        this.membersStats.fetchTimeline().then(({events}) => {
            this.events.data = events;
            this.events.loading = false;
        }, (error) => {
            this.events.error = error;
            this.events.loading = false;
        });
    }
}
