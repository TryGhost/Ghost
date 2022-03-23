import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartTotalMembers extends Component {
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
    
    get chartType() {
        return 'line';
    }

    get chartData() {
        const stats = this.fillCountDates(this.dashboardStats.memberCountStats, this.args.days);
        const labels = Object.keys(stats);
        const data = Object.values(stats).map(stat => stat.total);

        return {
            labels: labels,
            datasets: [{
                data: data,
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
        return 300;
    }

    /**
     * This method is borrowed from the members stats service and would need an update
     */
    fillCountDates(data = {}, days) {
        let currentRangeDate = moment().subtract(days, 'days');

        let endDate = moment().add(1, 'hour');
        const output = {};
        const firstDateInRangeIndex = data.findIndex((val) => {
            return moment(val.date).isAfter(currentRangeDate);
        });
        let initialDateInRangeVal = firstDateInRangeIndex > 0 ? data[firstDateInRangeIndex - 1] : null;
        if (firstDateInRangeIndex === 0 && !initialDateInRangeVal) {
            initialDateInRangeVal = data[firstDateInRangeIndex];
        }
        if (data.length > 0 && !initialDateInRangeVal && firstDateInRangeIndex !== 0) {
            initialDateInRangeVal = data[data.length - 1];
        }
        let lastVal = {
            paid: initialDateInRangeVal ? initialDateInRangeVal.paid : 0,
            free: initialDateInRangeVal ? initialDateInRangeVal.free : 0,
            comped: initialDateInRangeVal ? initialDateInRangeVal.comped : 0,
            total: initialDateInRangeVal ? (initialDateInRangeVal.paid + initialDateInRangeVal.free + initialDateInRangeVal.comped) : 0
        };
        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            output[dateStr] = dataOnDate ? {
                paid: dataOnDate.paid,
                free: dataOnDate.free,
                comped: dataOnDate.comped,
                total: dataOnDate.paid + dataOnDate.free + dataOnDate.comped
            } : lastVal;
            lastVal = output[dateStr];
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }
}
