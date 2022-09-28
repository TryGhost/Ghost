import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

const CHART_COLORS = [
    '#8e42ff',
    '#BB4AE5',
    '#DD97C9',
    '#E19A98',
    '#F5C9C2',
    '#E6E9EB'
];

export default class SourceAttributionChart extends Component {
    @service feature;

    get sources() {
        return this.args.sources;
    }

    get chartOptions() {
        let chartTitle = 'Free signups';
        if (this.args.sortColumn === 'signups') {
            chartTitle = 'Free signups';
        } else {
            chartTitle = 'Paid conversions';
        }

        return {
            cutoutPercentage: 70,
            title: {
                display: false,
                text: chartTitle,
                position: 'bottom',
                padding: 12,
                fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif',
                color: '#7c8b9a',
                fontSize: 12,
                fontStyle: '600'
            },
            legend: {
                display: false
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                enabled: false,
                intersect: false,
                mode: 'single',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-dashboard-attribution-tooltip');

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return;
                    }

                    let offsetX = 10;
                    let offsetY = 15;

                    // update tooltip styles
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x + offsetX + 'px';
                    tooltipEl.style.top = tooltip.y + offsetY + 'px';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const tooltipTextEl = document.querySelector('#gh-dashboard-attribution-tooltip .gh-dashboard-tooltip-value');
                        // const label = data.datasets[tooltipItems.datasetIndex].label || '';
                        const label = data.labels[tooltipItems.index] || '';
                        var value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                        if (value < 0) {
                            value = -value;
                        }

                        tooltipTextEl.innerHTML = `<span class="indicator solid" style="background-color: ${data.datasets[tooltipItems.datasetIndex].backgroundColor[tooltipItems.index]}"></span><span class="value">${value}</span><span class="metric">${label}</span>`;
                    },
                    title: () => {
                        return null;
                    }
                }
            },
            aspectRatio: 1
        };
    }

    get chartData() {
        let borderColor = this.feature.nightShift ? '#101114' : '#fff';

        if (this.args.sortColumn === 'signups') {
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
                    borderColor: borderColor,
                    hoverBorderWidth: 2,
                    hoverBorderColor: borderColor
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
                    borderColor: borderColor,
                    hoverBorderWidth: 2,
                    hoverBorderColor: borderColor
                }]
            };
        }
    }
}
