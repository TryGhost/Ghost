import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatNumber} from '../../../helpers/format-number';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const STATUS_OPTIONS = [{
    name: 'All members',
    value: 'total'
}, {
    name: 'Paid members',
    value: 'paid'
}, {
    name: 'Free members',
    value: 'free'
}];

export default class Engagement extends Component {
    @service dashboardStats;

    @action
    loadCharts() {
        this.dashboardStats.lastSeenFilterStatus = this.status;
        this.dashboardStats.loadLastSeen();
        this.dashboardStats.loadMemberCountStats();
        this.dashboardStats.loadNewsletterSubscribers();
    }

    @tracked status = 'total';
    statusOptions = STATUS_OPTIONS;

    get selectedStatusOption() {
        return this.statusOptions.find(option => option.value === this.status);
    }

    @action 
    onSwitchStatus(selected) {
        this.status = selected.value;
        this.dashboardStats.lastSeenFilterStatus = this.status;
        this.dashboardStats.loadLastSeen();
    }

    get loading() {
        return this.dashboardStats.memberCounts === null
            || !this.dashboardStats.memberCounts[this.status]
            || this.dashboardStats.membersLastSeen30d === null 
            || this.dashboardStats.membersLastSeen7d === null;
    }
    
    get data30Days() {
        // fake empty data
        if (this.isTotalMembersZero) {
            return '30%';
        }

        if (this.loading) {
            return '- %';
        }
        const total = this.dashboardStats.memberCounts[this.status];
        const part = this.dashboardStats.membersLastSeen30d;
        
        if (total <= 0) {
            return '- %';
        }

        const percentage = Math.round(part / total * 100);
        return `${percentage}%`;
    }

    get data7Days() {
        // fake empty data
        if (this.isTotalMembersZero) {
            return '60%';
        }

        if (this.loading) {
            return '- %';
        }
        const total = this.dashboardStats.memberCounts[this.status];
        const part = this.dashboardStats.membersLastSeen7d;
        
        if (total <= 0) {
            return '- %';
        }

        const percentage = Math.round(part / total * 100);
        return `${percentage}%`;
    }

    get dataSubscribers() {
        // fake empty data
        if (this.isTotalMembersZero) {
            return '123';
        }

        if (!this.dashboardStats.newsletterSubscribers) {
            return '-';
        }

        return formatNumber(this.dashboardStats.newsletterSubscribers[this.status]);
    }

    get dataEmailsSent() {
        return this.dashboardStats.emailsSent30d ?? 0;
    }

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts && this.totalMembers === 0;
    }
}
