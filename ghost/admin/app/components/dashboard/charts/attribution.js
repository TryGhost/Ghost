import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const CHART_COLORS = [
    '#853EED',
    '#CA3FED',
    '#E993CC',
    '#EE9696',
    '#FEC7C0',
    '#E6E9EB'
];
export default class Recents extends Component {
    @service dashboardStats;
    @tracked chartType = 'free';

    @action
    loadData() {
        this.dashboardStats.loadMemberAttributionStats();
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
                    fontFamily: "Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif"
                }
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                enabled: false
            }
        };
    }

    get chartData() {
        if (this.chartType === 'free') {
            const sortedByFree = [...this.sources];
            sortedByFree.sort((a, b) => {
                return b.freeSignups - a.freeSignups;
            });
            return {
                labels: sortedByFree.slice(0, 5).map(source => source.source),
                datasets: [{
                    label: 'Free Signups',
                    data: sortedByFree.slice(0, 5).map(source => source.freeSignups),
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
                fontFamily: "Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif"
            }
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
                const chartContainerEl = tooltipEl.parentElement;
                const chartWidth = chartContainerEl.offsetWidth;
                const tooltipWidth = tooltipEl.offsetWidth;

                // only show tooltip when active
                if (tooltip.opacity === 0) {
                    tooltipEl.style.opacity = 0;
                    return; 
                }

                let offsetX = 0;

                if (that.mode === 'cadence') {
                    // these adjustments should match the special width and margin values in css
                    if (tooltip.x > (chartWidth * 0.69) - tooltipWidth) {
                        offsetX = tooltipWidth - 10;
                    }
                    offsetX -= (chartWidth * 0.30);
                } else {
                    if (tooltip.x > chartWidth - tooltipWidth) {
                        offsetX = tooltipWidth - 10;
                    } 
                }

                // update tooltip styles
                tooltipEl.style.opacity = 1;
                tooltipEl.style.position = 'absolute';
                tooltipEl.style.left = tooltip.x - offsetX + 'px';
                tooltipEl.style.top = '30px';
            },
            callbacks: {
                label: (tooltipItems, data) => {
                    const tooltipTextEl = document.querySelector('#gh-dashboard-attribution-tooltip .gh-dashboard-tooltip-value');
                    const label = data.datasets[tooltipItems.datasetIndex].label || '';
                    var value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                    if (value < 0) {
                        value = -value;
                    }
                    if (that.isTotalMembersZero || totalCadence === 0) {
                        value = 0;
                    } else {
                        value += '%';
                    }
                    tooltipTextEl.innerHTML = `<span class="indicator solid" style="background-color: ${data.datasets[tooltipItems.datasetIndex].backgroundColor}"></span><span class="value">${value}</span><span class="metric">${label}</span>`;
                },
                title: () => {
                    return null;
                }
            }
        }
    };
}

    get sources() {
        return this.dashboardStats?.memberSourceAttributionCounts || [];
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
