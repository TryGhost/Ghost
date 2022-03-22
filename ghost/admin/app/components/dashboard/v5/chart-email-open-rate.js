import Component from '@glimmer/component';

export default class ChartEmailOpenRate extends Component {
    get dataSubscribers() {
        return '9,250';
    }

    get dataEmailsSent() {
        return '40.3k';
    }

    get chartType() {
        return 'bar';
    }

    get chartData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June'],
            datasets: [{
                data: [65, 59, 80, 81, 56, 55, 40],
                fill: false,
                backgroundColor: '#14b8ff',
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
