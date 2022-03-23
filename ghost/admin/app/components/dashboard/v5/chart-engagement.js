import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class ChartEngagement extends Component {
    @service dashboardStats;

    constructor() {
        super(...arguments);
        this.loadCharts();
    }

    loadCharts() {
        this.dashboardStats.loadLastSeen(this.status);
        this.dashboardStats.loadMembersCounts();
    }

    get status() {
        // todo: this should come from a dropdown
        // + reload stats after changing this value
        return 'total';
    }

    get loading() {
        return this.dashboardStats.memberCounts === null
            || !this.dashboardStats.memberCounts[this.status]
            || this.dashboardStats.membersLastSeen30d === null 
            || this.dashboardStats.membersLastSeen7d === null;
    }
    
    get data30Days() {
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
}
