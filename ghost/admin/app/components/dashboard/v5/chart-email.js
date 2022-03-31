import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartEmailOpenRate extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadNewsletterSubscribers();
        this.dashboardStats.loadEmailsSent();
        this.dashboardStats.loadEmailOpenRateStats();
    }
    
    get dataSubscribers() {
        // @todo: show paid, free, total together
        return this.dashboardStats.newsletterSubscribers ?? {
            total: 0,
            free: 0,
            paid: 0
        };
    }

    get dataEmailsSent() {
        return this.dashboardStats.emailsSent30d ?? 0;
    }

    get loading() {
        return this.dashboardStats.emailOpenRateStats === null;
    }

    get chartType() {
        return 'bar';
    }

    get chartData() {
        const stats = this.dashboardStats.emailOpenRateStats;
        const labels = stats.map(stat => stat.subject);
        const data = stats.map(stat => stat.openRate);

        return {
            labels,
            datasets: [{
                data,
                fill: false,
                backgroundColor: '#14b8ff',
                tension: 0.1,
                cubicInterpolationMode: 'monotone',
                pointRadius: 0,
                pointHitRadius: 10,
                borderColor: '#14b8ff',
                borderJoinStyle: 'miter',
                maxBarThickness: 20,
                minBarLength: 2
            }]
        };
    }

    get chartOptions() {
        return {
            title: {
                display: false
            },
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    gridLines: {
                        drawTicks: false,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        fontColor: '#7C8B9A',
                        padding: 8,
                        precision: 0
                    }
                }],
                xAxes: [{
                    gridLines: {
                        drawTicks: false,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        autoSkip: true,
                        maxRotation: 0,
                        minRotation: 0
                    }
                }]
            }
        };
    }

    get chartHeight() {
        return 175;
    }
}
