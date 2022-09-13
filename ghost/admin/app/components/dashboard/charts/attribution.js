import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
// import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service dashboardStats;

    @action
    loadData() {
        this.dashboardStats.loadMemberAttributionStats();
    }

    get sources() {
        return this.dashboardStats?.memberSourceAttributionCounts;
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
