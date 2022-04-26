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

    get chartData() {
        const totalCadence = this.dashboardStats.paidMembersByCadence.monthly + this.dashboardStats.paidMembersByCadence.annual;
        const monthlyPercentage = Math.round(this.dashboardStats.paidMembersByCadence.monthly / totalCadence * 100);
        const annualPercentage = Math.round(this.dashboardStats.paidMembersByCadence.annual / totalCadence * 100);

        if (this.mode === 'cadence') {
            return {
                labels: ['Candence'],
                datasets: [{
                    label: 'Monthly',
                    data: [monthlyPercentage],
                    fill: true,
                    backgroundColor: '#8E42FF',
                    barThickness: 7
                }, {
                    label: 'Annual',
                    data: [annualPercentage],
                    fill: true,
                    backgroundColor: '#FB76B4',
                    barThickness: 7
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
                fill: true,
                borderRadius: 15,
                barThickness: 7
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
                padding: (this.mode === 'cadence' ? {
                    left: 0,
                    right: 21,
                    top: 30
                } : {
                    top: 30,
                    left: 21,
                    right: 21,
                    bottom: 30
                })
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
                enabled: true,
                intersect: false,
                mode: 'single',
                displayColors: false,
                backgroundColor: '#15171A',
                yPadding: 7,
                cornerRadius: 5,
                caretSize: 7,
                caretPadding: 5,
                bodyFontSize: 12.5,
                titleFontSize: 12,
                titleFontStyle: 'normal',
                titleFontColor: 'rgba(255, 255, 255, 0.7)',
                titleMarginBottom: 3,
                yAlign: 'bottom',
                xAlign: 'center',
                callbacks: {
                    label: function (tooltipItem, data) {
                        const label = data.datasets[tooltipItem.datasetIndex].label || '';
                        const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] || 0;
                        return `${label}: ${value}%`;
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