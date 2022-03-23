import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartPaidMembers extends Component {
    @service dashboardStats;

    constructor() {
        super(...arguments);
        this.loadCharts();
    }

    /**
     * Call this method when you need to fetch new data from the server. In this component, it will get called
     * when the days parameter changes and on initialisation.
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadMemberCountStats(this.args.days);
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get chartType() {
        return 'bar';
    }

    get chartData() {
        const stats = this.dashboardStats.memberCountStats;
        const labels = stats.map(stat => stat.date);
        const newData = stats.map(stat => stat.newPaid);
        const canceledData = stats.map(stat => -stat.canceledPaid);

        return {
            labels: labels,
            datasets: [
                {
                    data: newData,
                    fill: false,
                    backgroundColor: '#14b8ff',
                    tension: 0.1
                },{
                    data: canceledData,
                    fill: false,
                    backgroundColor: '#E16262',
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
        return 150;
    }
}
