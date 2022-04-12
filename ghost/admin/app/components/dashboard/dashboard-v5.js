import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class DashboardDashboardV5Component extends Component {
    @service dashboardStats;

    @action
    onInsert() {
        this.dashboardStats.loadSiteStatus();
    }

    get isLoading() {
        return this.dashboardStats.siteStatus === null;
    }

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }
}
