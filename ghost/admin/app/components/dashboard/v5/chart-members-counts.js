import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChartMembersCounts extends Component {
    @service dashboardStats;

    @action
    loadCharts() {
        this.dashboardStats.loadMembersCounts();
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get paidMembers() {
        return this.dashboardStats.memberCounts?.paid ?? 0;
    }

    get freeMembers() {
        return this.dashboardStats.memberCounts?.free ?? 0;
    }

    get hasTrends() {
        return this.dashboardStats.memberCounts !== null && this.dashboardStats.memberCountsTrend !== null;
    }

    get totalMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.total, this.dashboardStats.memberCounts.total);
    }

    get paidMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.paid, this.dashboardStats.memberCounts.paid);
    }

    get freeMembersTrend() {
        return this.calculatePercentage(this.dashboardStats.memberCountsTrend.free, this.dashboardStats.memberCounts.free);
    }

    calculatePercentage(from, to) {
        if (from === 0) {
            if (to > 0) {
                return 100;
            }
            return 0;
        }

        return Math.round((to - from) / from * 100);
    }
}
