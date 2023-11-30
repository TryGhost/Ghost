import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class FeedbackEventsChart extends Component {
    @service feature;
    @tracked tooltipData = {};
    tooltipNode = null;

    @action
    onTooltipInsert(node) {
        this.tooltipNode = node;
    }

    @action
    onMouseleave() {
        this.tooltipNode.style.display = 'none';
    }

    getSumOfData() {
        return this.args.data.values.reduce((acc, value) => {
            return acc + value;
        }, 0);
    }

    setTooltipData(data) {
        this.tooltipData = data;
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
                    tooltipEl.style.display = 'block';
                    tooltipEl.style.opacity = '1';
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x + offsetX + 'px';
                    tooltipEl.style.top = tooltip.y + offsetY + 'px';
                    tooltipEl.style.pointerEvents = 'all';
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const label = data.labels[tooltipItems.index] || '';
                        const value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                        const percent = Math.round(value / this.getSumOfData() * 100);
                        const tooltipData = {
                            color: data.datasets[tooltipItems.datasetIndex].backgroundColor[tooltipItems.index],
                            href: this.args.data.links[tooltipItems.index],
                            value: value.toLocaleString('en-US'),
                            label,
                            percent
                        };
                        this.setTooltipData(tooltipData);
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
        let borderColor = this.feature.nightShift ? '#15171A' : '#fff';

        return {
            labels: this.args.data.labels,
            datasets: [{
                label: 'Feedback events',
                data: this.args.data.values,
                backgroundColor: this.args.data.colors,
                borderWidth: 2,
                borderColor: borderColor,
                hoverBorderWidth: 2,
                hoverBorderColor: borderColor
            }]
        };
    }
}
