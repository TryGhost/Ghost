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
        if (this.mode === 'cadence') {
            return {
                labels: ['Monthly', 'Annual'],
                datasets: [{
                    data: [this.dashboardStats.paidMembersByCadence.monthly, this.dashboardStats.paidMembersByCadence.annual],
                    fill: false,
                    backgroundColor: ['#8E42FF', '#FB76B4', '#E9B0CC', '#F1D5E3'],
                    barThickness: 6
                }]
            };
        }

        const labels = this.dashboardStats.paidMembersByTier.map(stat => stat.tier.name);
        const data = this.dashboardStats.paidMembersByTier.map(stat => stat.members);

        return {
            labels,
            datasets: [{
                data,
                fill: false,
                backgroundColor: ['#8E42FF', '#FB76B4', '#E9B0CC', '#F1D5E3'],
                barThickness: 6
            }]
        };
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutoutPercentage: (this.mode === 'cadence' ? 85 : 75),
            legend: {
                display: false
            },
            animation: {
                duration: 0
            },
            hover: {
                onHover: function (e) {
                    e.target.style.cursor = 'pointer';
                }
            },
            tooltips: {
                intersect: false,
                mode: 'index',
                displayColors: false,
                backgroundColor: '#15171A',
                xPadding: 7,
                yPadding: 7,
                cornerRadius: 5,
                caretSize: 7,
                caretPadding: 5,
                bodyFontSize: 12.5,
                titleFontSize: 12,
                titleFontStyle: 'normal',
                titleFontColor: 'rgba(255, 255, 255, 0.7)',
                titleMarginBottom: 3
            },
            scales: {
                yAxes: [{
                    gridLines: {
                        display: true,
                        drawBorder: false,
                        color: 'transparent',
                        lineWidth: 0,
                        zeroLineColor: 'transparent',
                        zeroLineWidth: 1
                    },
                    ticks: {
                        display: true,
                        fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Droid Sans,Helvetica Neue,sans-serif',
                        fontSize: 13,
                        fontColor: '#626d79'
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

    get chartHeight() {
        return 75;
    }
}