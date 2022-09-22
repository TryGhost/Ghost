import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

const CHART_COLORS = [
    '#853EED',
    '#CA3FED',
    '#E993CC',
    '#EE9696',
    '#FEC7C0',
    '#E6E9EB'
];

export default class SourceAttributionChart extends Component {
    @tracked chartType = 'free';

    get sources() {
        return this.args.sources;
    }

    get chartOptions() {
        return {
            cutoutPercentage: 70,
            borderColor: '#fff',
            legend: {
                display: false,
                position: 'bottom',
                align: 'center',
                labels: {
                    color: 'rgb(255, 99, 132)',
                    fontSize: 12,
                    boxWidth: 10,
                    padding: 6,
                    usePointStyle: true,
                    fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif'
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                enabled: false
            },
            aspectRatio: 1
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
                    label: 'Signups',
                    data: sortedByFree.slice(0, 5).map(source => source.signups),
                    backgroundColor: CHART_COLORS.slice(0, 5),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            };
        } else {
            const sortedByPaid = [...this.sources];
            sortedByPaid.sort((a, b) => {
                return b.paidConversions - a.paidConversions;
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
