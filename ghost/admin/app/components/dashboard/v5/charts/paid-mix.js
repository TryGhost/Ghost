import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const MODE_OPTIONS = [{
    name: 'Cadence',
    value: 'cadence'
}, {
    name: 'Tiers',
    value: 'tiers'
}];

export default class PaidMix extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        if (this.mode === 'cadence') {
            this.dashboardStats.loadPaidMembersByCadence();
        } else {
            this.dashboardStats.loadPaidMembersByTier();
        }
    }

    @tracked mode = 'cadence';
    modeOptions = MODE_OPTIONS;

    get selectedModeOption() {
        return this.modeOptions.find(option => option.value === this.mode);
    }

    get hasMultipleTiers() {
        return this.dashboardStats.siteStatus?.hasMultipleTiers;
    } 

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts && this.totalMembers === 0;
    }

    @action 
    onSwitchMode(selected) {
        this.mode = selected.value;

        if (this.loading) {
            // We don't have the data yet for the newly selected mode
            this.loadCharts();
        }
    }

    get loading() {
        if (this.mode === 'cadence') {
            return this.dashboardStats.paidMembersByCadence === null;
        }
        return this.dashboardStats.paidMembersByTier === null;
    }
    
    get chartType() {
        return 'horizontalBar';
    }

    get hasData() {
        return (this.dashboardStats.paidMembersByCadence.month + this.dashboardStats.paidMembersByCadence.year) > 0;
    }

    get chartData() {
        const totalCadence = this.dashboardStats.paidMembersByCadence.month + this.dashboardStats.paidMembersByCadence.year;
        const monthlyPercentage = Math.round(this.dashboardStats.paidMembersByCadence.month / totalCadence * 100);
        const annualPercentage = Math.round(this.dashboardStats.paidMembersByCadence.year / totalCadence * 100);
        const barThickness = 5;

        // fake empty data
        if (this.isTotalMembersZero) {
            return {
                labels: ['Cadence'],
                datasets: [{
                    label: 'All',
                    data: [100],
                    backgroundColor: '#EBEEF0',
                    barThickness
                }]
            };
        }

        if (this.mode === 'cadence') {
            return {
                labels: ['Cadence'],
                datasets: [{
                    label: 'Monthly',
                    data: [monthlyPercentage],
                    backgroundColor: '#8E42FF',
                    barThickness
                }, {
                    label: 'Annual',
                    data: [annualPercentage],
                    backgroundColor: '#FB76B4',
                    barThickness
                }]
            };
        }

        const labels = this.dashboardStats.paidMembersByTier.map(stat => stat.tier.name);
        const data = this.dashboardStats.paidMembersByTier.map(stat => stat.members);
        const colors = ['#853EED', '#CA3FED', '#E993CC', '#DB7777', '#EE9696', '#FEC7C0', '#853EED', '#CA3FED', '#E993CC', '#DB7777', '#EE9696', '#FEC7C0'];

        let totalTiersAmount = 0;
        for (let i = 0; i < data.length; i++) {
            totalTiersAmount += data[i];
        }

        let datasets = [];
        for (let i = 0; i < data.length; i++) {
            let tierPercentage = Math.round(data[i] / totalTiersAmount * 100);
            datasets.push({
                data: [tierPercentage],
                label: labels[i],
                backgroundColor: colors[i],
                barThickness
            });
        }

        return {
            labels: ['Tiers'],
            datasets
        };
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: false
            },
            layout: {
                padding: {
                    top: 72,
                    bottom: 0,
                    left: 0,
                    right: 4
                }
            },
            animation: {
                duration: 0
            },
            responsiveAnimationDuration: 0,
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
                    const tooltipEl = document.getElementById('gh-dashboard5-mix-tooltip');

                    // only show tooltip when active
                    if (tooltip.opacity === 0) {
                        tooltipEl.style.display = 'none';
                        tooltipEl.style.opacity = 0;
                        return; 
                    }

                    // update tooltip styles
                    tooltipEl.style.display = 'block';
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltip.x + 'px';
                    tooltipEl.style.top = tooltip.y + 'px';    
                },
                callbacks: {
                    label: (tooltipItems, data) => {
                        const tooltipTextEl = document.querySelector('#gh-dashboard5-mix-tooltip .gh-dashboard5-tooltip-value');
                        if (this.isTotalMembersZero) {
                            tooltipTextEl.innerHTML = 'Currently has no data';
                        } else {
                            const label = data.datasets[tooltipItems.datasetIndex].label || '';
                            const value = data.datasets[tooltipItems.datasetIndex].data[tooltipItems.index] || 0;
                            tooltipTextEl.innerHTML = `<span class="indicator solid" style="background-color: ${data.datasets[tooltipItems.datasetIndex].backgroundColor}"></span><span class="value">${value}%</span><span class="label">${label}</span>`;
                        }
                    },
                    title: () => {
                        return null;
                    }
                }
            },
            scales: {
                yAxes: [{
                    stacked: true,
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                }],
                xAxes: [{
                    stacked: true,
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                }]
            }
        };
    }

    get isChartCadence() {
        return (this.mode === 'cadence');
    }

    get isChartTiers() {
        return (this.mode === 'tiers');
    }
}
