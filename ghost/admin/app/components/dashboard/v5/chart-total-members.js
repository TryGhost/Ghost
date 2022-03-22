import Component from '@glimmer/component';

export default class ChartTotalMembers extends Component {
    get chartType() {
        return 'line';
    }

    get chartData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June'],
            datasets: [{
                data: [65, 59, 80, 81, 56, 55, 40],
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
}
