import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const DATE_FORMAT = 'D MMM YYYY';

export default class ChartPaidMembers extends Component {
    @service dashboardStats;
    
    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadMemberCountStats();
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get chartType() {
        return 'bar';
    }

    get chartData() {
        const stats = this.dashboardStats.filledMemberCountStats;
        const labels = stats.map(stat => stat.date);
        const newData = stats.map(stat => stat.paidSubscribed);
        const canceledData = stats.map(stat => -stat.paidCanceled);

        return {
            labels: labels,
            datasets: [
                {
                    data: newData,
                    fill: true,
                    backgroundColor: '#7BA4F3',
                    barThickness: 10
                },{
                    data: canceledData,
                    fill: true,
                    backgroundColor: '#E5E5E5',
                    barThickness: 10
                }]
        };
    }

    get chartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: false
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
                titleMarginBottom: 3,
                callbacks: {
                    title: (tooltipItems) => {
                        return moment(tooltipItems[0].xLabel).format(DATE_FORMAT);
                    }
                }
            },
            scales: {
                yAxes: [{
                    offset: true,
                    gridLines: {
                        drawTicks: false,
                        display: true,
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
                    offset: true,
                    stacked: true,
                    gridLines: {
                        drawTicks: true,
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        maxTicksLimit: 5,
                        autoSkip: true
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
        return 125;
    }
}
