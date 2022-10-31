import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

const CHART_COLORS = [
    '#F080B2',
    '#8452f633'
];

const linksClass = ['gh-post-activity-chart-positive-feedback', 'gh-post-activity-chart-negative-feedback'];

export default class FeedbackEventsChart extends Component {
    @service feature;

    getSumOfData() {
        return this.args.data.reduce((acc, value) => {
            return acc + value;
        }, 0);
    }

    get chartOptions() {
        return {
            cutoutPercentage: 70,
            title: {
                display: false
            },
            legend: {
                display: false
            },
            tooltips: {
                enabled: false,
                mode: 'label',
                custom: function (tooltip) {
                    // get tooltip element
                    const tooltipEl = document.getElementById('gh-feedback-events-tooltip');

                    let offsetX = -50;
                    let offsetY = -100;

                    // update tooltip styles
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x + offsetX + 'px';
                    tooltipEl.style.top = tooltip.y + offsetY + 'px';
                    tooltipEl.style.pointerEvents = 'all';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const tooltipTextEl = document.getElementById('gh-feedback-events-tooltip-body');
                        const label = data.labels[tooltipItems.index] || '';
                        const value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                        const formattedValue = value.toLocaleString('en-US');
                        const percent = Math.round(value / this.getSumOfData() * 100);
                        const links = document.querySelectorAll(`.gh-feedback-events-tooltip-template .gh-post-activity-chart-link`);
                        links.forEach((link) => {
                            link.setAttribute('hidden', 'true');
                        });
                        const linkNode = document.querySelector(`.${linksClass[tooltipItems.index]}`);
                        linkNode.setAttribute('hidden', 'false');

                        tooltipTextEl.innerHTML = (`
                            <div class="gh-feedback-events-tooltip-body">
                                <span
                                  class="gh-feedback-events-tooltip-badge"
                                  style="background-color: ${data.datasets[tooltipItems.datasetIndex].backgroundColor[tooltipItems.index]}"
                                ></span>
                                <span class="gh-feedback-events-tooltip-info">${formattedValue}</span>
                                <span>${percent}%</span>
                            </div>

                            <span class="gh-feedback-events-tooltip-metric">${label}</span>
                        `);
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

        return {
            labels: ['More like this', 'Less like this'],
            datasets: [{
                label: 'Feedback events',
                data: this.args.data,
                backgroundColor: CHART_COLORS,
                borderWidth: 2,
                borderColor: borderColor,
                hoverBorderWidth: 2,
                hoverBorderColor: borderColor
            }]
        };
    }
}
