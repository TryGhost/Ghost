import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class ChartMembersCounts extends Component {
    @service dashboardStats;

    constructor() {
        super(...arguments);
        this.loadCharts();
    }

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
}
