import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartMonthlyRevenue extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadMrrStats();
    }

    get loading() {
        return this.dashboardStats.mrrStats === null;
    }

    get chartType() {
        return 'line';
    }

    get chartData() {
        const stats = this.dashboardStats.mrrStats;
        const labels = stats.map(stat => stat.date);
        const data = stats.map(stat => stat.mrr);

        return {
            labels: labels,
            datasets: [{
                data: data,
                tension: 0.1,
                cubicInterpolationMode: 'monotone',
                fill: true,
                fillColor: '#F5FBFF',
                backgroundColor: '#F5FBFF',
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
                    },
                    type: 'time',
                    time: {
                        displayFormats: {
                            millisecond: 'MMM DD',
                            second: 'MMM DD',
                            minute: 'MMM DD',
                            hour: 'MMM DD',
                            day: 'MMM DD',
                            week: 'MMM DD',
                            month: 'MMM DD',
                            quarter: 'MMM DD',
                            year: 'MMM DD'
                        }
                    }
                }]
            }
        };
    }

    get chartHeight() {
        return 200;
    }
}
