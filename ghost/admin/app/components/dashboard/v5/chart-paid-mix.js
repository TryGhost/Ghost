import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartPaidMix extends Component {
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
        if (this.mode === 'cadence') {
            this.dashboardStats.loadPaidMembersByCadence();
        } else {
            this.dashboardStats.loadPaidMembersByTier();
        }
    }

    get loading() {
        if (this.mode === 'cadence') {
            return this.dashboardStats.paidMembersByCadence === null;
        }
        return this.dashboardStats.paidMembersByTier === null;
    }

    get mode() {
        return 'cadence';
    }
    
    get chartType() {
        return 'pie';
    }

    get chartData() {
        if (this.mode === 'cadence') {
            return {
                labels: ['Monthly', 'Annual'],
                datasets: [{
                    data: [this.dashboardStats.paidMembersByCadence.monthly, this.dashboardStats.paidMembersByCadence.annual],
                    fill: false,
                    backgroundColor: ['#14b8ff'],
                    tension: 0.1
                }]
            };
        }
        throw new Error('Not yet supported');
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
