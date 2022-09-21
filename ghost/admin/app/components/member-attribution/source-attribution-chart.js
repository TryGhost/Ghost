import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

const CHART_COLORS = [
    '#853EED',
    '#CA3FED',
    '#E993CC',
    '#EE9696',
    '#FEC7C0'
];

export default class SourceAttributionChart extends Component {
    @tracked chartType = 'free';

    get sources() {
        return this.args.sources;
    }

    get chartOptions() {
        return {
            cutoutPercentage: 60,
            borderColor: '#555',
            legend: {
                display: true,
                position: 'top',
                align: 'start',
                labels: {
                    color: 'rgb(255, 99, 132)',
                    fontSize: 12,
                    boxWidth: 10,
                    padding: 3
                }
            }
        };
    }

    get chartData() {
        if (this.chartType === 'free') {
            const sortedByFree = [...this.sources];
            sortedByFree.sort((a, b) => {
                return b.signups - a.signups;
            });
            return {
                labels: sortedByFree.slice(0, 5).map(source => source.source),
                datasets: [{
                    label: 'Free Signups',
                    data: sortedByFree.slice(0, 5).map(source => source.signups),
                    backgroundColor: CHART_COLORS.slice(0, 5),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        } else {
            const sortedByPaid = [...this.sources];
            sortedByPaid.sort((a, b) => {
                return b.paidPercentage - a.paidPercentage;
            });
            return {
                labels: sortedByPaid.slice(0, 5).map(source => source.source),
                datasets: [{
                    label: 'Paid Conversions',
                    data: sortedByPaid.slice(0, 5).map(source => source.paidConversions),
                    backgroundColor: CHART_COLORS.slice(0, 5),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        }
    }
}
