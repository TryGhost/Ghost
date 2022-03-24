import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartTotalPaid extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. In this component, it will get called
     * when the days parameter changes and on initialisation.
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadMemberCountStats();
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get chartType() {
        return 'line';
    }

    get chartData() {
        const stats = this.dashboardStats.memberCountStats;
        const labels = stats.map(stat => stat.date);
        const data = stats.map(stat => stat.paid);

        return {
            labels,
            datasets: [{
                data,
                fill: false,
                borderColor: '#14b8ff',
                tension: 0.1
            }]
        };
    }

    get chartOptions() {
        return {
            legend: {
                display: false
            }
        };
    }

    get chartHeight() {
        return 100;
    }
}
