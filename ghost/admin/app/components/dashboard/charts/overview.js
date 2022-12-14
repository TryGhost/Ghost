import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatNumber} from '../../../helpers/format-number';
import {inject as service} from '@ember/service';

export default class Overview extends Component {
    @service dashboardStats;

    @action
    loadCharts() {
        this.dashboardStats.loadMemberCountStats();
    }

    get loading() {
        return this.dashboardStats.memberCountStats === null;
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersMoreThanZero() {
        return this.dashboardStats.memberCounts && this.totalMembers > 0;
    }

    get paidMembers() {
        return this.dashboardStats.memberCounts?.paid ?? 0;
    }

    get freeMembers() {
        return this.dashboardStats.memberCounts?.free ?? 0;
    }

    get totalMembersFormatted() {
        if (this.dashboardStats.memberCounts === null) {
            return '-';
        }
        return formatNumber(this.totalMembers);
    }

    get paidMembersFormatted() {
        if (this.dashboardStats.memberCounts === null) {
            return '-';
        }
        return formatNumber(this.paidMembers);
    }

    get freeMembersFormatted() {
        if (this.dashboardStats.memberCounts === null) {
            return '-';
        }
        return formatNumber(this.freeMembers);
    }

    get hasTrends() {
        return this.dashboardStats.memberCounts !== null 
            && this.dashboardStats.memberCountsTrend !== null
            && this.dashboardStats.currentMRR !== null
            && this.dashboardStats.currentMRRTrend !== null;
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

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
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
