import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

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
                    borderColor: '#9B90F9',
                    backgroundColor: '#9B90F9',
                    tension: 0.1,
                    barThickness: 10,
                    minBarLength: 3,
                    borderWidth: 2,
                    borderRadius: 5
                },{
                    data: canceledData,
                    fill: true,
                    borderColor: '#E28B9D',
                    backgroundColor: '#E28B9D',
                    tension: 0.1,
                    barThickness: 10,
                    minBarLength: 3,
                    borderWidth: 2,
                    borderRadius: 5
                }]
        };
    }

    get chartOptions() {
        return {
            animation: {
                duration: 0
            },
            title: {
                display: false
            },
            legend: {
                display: false
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
}
