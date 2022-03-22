import Component from '@glimmer/component';

export default class ChartPaidMix extends Component {
    get chartType() {
        return 'pie';
    }

    get chartData() {
        return {
            labels: ['Monthly', 'Annual'],
            datasets: [{
                data: [20, 80],
                fill: false,
                backgroundColor: ['#14b8ff'],
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
